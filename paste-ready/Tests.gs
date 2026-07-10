function runAllPGSTests() {
  const results = [];
  function test(name, fn) {
    try {
      fn();
      results.push({test: name, passed: true, message: 'Passed'});
    } catch (error) {
      results.push({test: name, passed: false, message: error.message});
    }
  }

  test('Library contains 43 current options', function() {
    assertEqual_(PGS_ACTIVITY_LIBRARY.length, 43);
  });

  test('Category keys are unique', function() {
    const keys = PGS_ACTIVITY_LIBRARY.map(function(item) { return item.categoryKey; });
    assertEqual_(new Set(keys).size, keys.length);
  });

  test('Every rule contains source and evidence metadata', function() {
    PGS_ACTIVITY_LIBRARY.forEach(function(rule) {
      if (!rule.sourcePage || !rule.sourceUrl || !rule.documentation ||
          !rule.limitations || !rule.approvalTiming ||
          !rule.packetInstructions || !rule.lastVerified) {
        throw new Error('Missing metadata for ' + rule.categoryKey);
      }
    });
  });



  test('Every current category has an evidence-driven entry mode', function() {
    const allowed = ['automatic','session_time','duration_hours','count','credit','credit_review','fixed','ceu_or_hours'];
    PGS_ACTIVITY_LIBRARY.forEach(function(rule) {
      if (allowed.indexOf(rule.entryMode) === -1) {
        throw new Error(rule.categoryKey + ' has invalid entry mode: ' + rule.entryMode);
      }
      if (!rule.quantityLabel || !rule.quantityHelp || !rule.evidenceInputBasis) {
        throw new Error(rule.categoryKey + ' is missing evidence-driven input guidance.');
      }
    });
  });

  test('Grant and IEP categories are count based, not time based', function() {
    const grant = findRuleForTest_('GRANT_RECIPIENT');
    const writer = findRuleForTest_('WRITE_IEP_MDT');
    const team = findRuleForTest_('IEP_MDT_TEAM');
    assertEqual_(grant.entryMode, 'count');
    assertEqual_(grant.perUnitCUs, 3);
    assertEqual_(writer.entryMode, 'count');
    assertEqual_(writer.perUnitCUs, 1);
    assertEqual_(team.entryMode, 'count');
    assertEqual_(team.perUnitCUs, 0.5);
  });

  test('Time-Based Activities categories require exact session times', function() {
    ['PLC','SCHOOL_PD','TEACH_DISTRICT_PD','MENTOR','CORE_TUTORING'].forEach(function(key) {
      assertEqual_(findRuleForTest_(key).entryMode, 'session_time');
    });
  });

  test('Certificate-duration categories do not require invented times', function() {
    ['VEGAS_PBS_PD','RPDP_PD','CCEA_COLLAB_PD','ASYNC_CONFERENCE_WEBINAR'].forEach(function(key) {
      assertEqual_(findRuleForTest_(key).entryMode, 'duration_hours');
    });
  });

  test('Guided finder covers all 43 current category keys', function() {
    const finderKeys = [];
    (PGS_GUIDED_FINDER.contexts || []).forEach(function(context) {
      (context.roles || []).forEach(function(role) {
        (role.activities || []).forEach(function(activity) {
          if (activity.categoryKey) finderKeys.push(activity.categoryKey);
        });
      });
    });

    const currentKeys = PGS_ACTIVITY_LIBRARY.map(function(rule) {
      return rule.categoryKey;
    });

    const missing = currentKeys.filter(function(key) {
      return finderKeys.indexOf(key) === -1;
    });

    if (missing.length) {
      throw new Error('Finder is missing: ' + missing.join(', '));
    }
  });

  test('Guided finder contains only known category keys and documented choices', function() {
    const currentKeys = PGS_ACTIVITY_LIBRARY.map(function(rule) {
      return rule.categoryKey;
    });

    (PGS_GUIDED_FINDER.contexts || []).forEach(function(context) {
      if (!context.label || !context.description) {
        throw new Error('Incomplete context: ' + context.id);
      }

      (context.roles || []).forEach(function(role) {
        if (!role.label || !role.description) {
          throw new Error('Incomplete role: ' + role.id);
        }

        (role.activities || []).forEach(function(activity) {
          if (!activity.label || !activity.description || !activity.officialBasis) {
            throw new Error('Incomplete guided activity: ' + activity.id);
          }

          if (activity.categoryKey &&
              currentKeys.indexOf(activity.categoryKey) === -1) {
            throw new Error('Unknown category key: ' + activity.categoryKey);
          }
        });
      });
    });
  });

  test('May 1, 2024 cutoff is enforced', function() {
    let rejected = false;
    try {
      normalizeActivityInput_({
        title: 'Old Activity',
        description: '',
        organization: 'Test School',
        role: 'PLC Participant',
        categoryKey: 'PLC',
        paymentStatus: 'unpaid',
        sessions: [
          {
            date: '2024-04-30',
            startTime: '15:00',
            endTime: '18:00',
            breakMinutes: 0,
            description: 'Testing the applicability cutoff'
          }
        ]
      }, findRuleForTest_('PLC'));
    } catch (error) {
      rejected = error.message.indexOf('May 1, 2024') >= 0;
    }
    if (!rejected) throw new Error('Older activity was not rejected.');
  });

  test('Session hours are calculated from times and breaks', function() {
    const sessions = normalizeSessions_([
      {
        date: '2026-07-08',
        startTime: '15:00',
        endTime: '17:30',
        breakMinutes: 30,
        paymentStatus: 'unpaid',
        description: 'PLC planning and student-data review'
      }
    ], 'unpaid');
    assertEqual_(sessions[0].minutes, 120);
    assertEqual_(sessions[0].hours, 2);
  });

  test('One payment status applies to the complete time-based activity', function() {
    const activity = {
      paymentStatus: 'paid',
      quantity: 0,
      unit: 'hours',
      titleIException: 'no',
      sessions: normalizeSessions_([
        {
          date: '2026-07-08',
          startTime: '15:00',
          endTime: '18:00',
          breakMinutes: 0,
          description: 'PLC planning and student-data review'
        },
        {
          date: '2026-07-09',
          startTime: '15:00',
          endTime: '18:00',
          breakMinutes: 0,
          description: 'PLC follow-up and instructional planning'
        }
      ], 'paid')
    };
    assertEqual_(calculateEstimatedCUs_(activity, findRuleForTest_('PLC')), 1);
  });

  test('Invalid session times are rejected', function() {
    let rejected = false;
    try {
      normalizeSessions_([
        {
          date: '2026-07-08',
          startTime: '17:00',
          endTime: '16:00',
          breakMinutes: 0,
          paymentStatus: 'unpaid',
          description: 'Invalid-time validation test'
        }
      ], 'unpaid');
    } catch (error) {
      rejected = error.message.indexOf('later than') >= 0;
    }
    if (!rejected) throw new Error('Invalid session time was not rejected.');
  });


  test('Dashboard shows separate estimated and approved remaining totals', function() {
    const activities = [
      {
        categoryKey: 'GRANT_RECIPIENT',
        estimatedCUs: 6,
        status: 'Draft'
      },
      {
        categoryKey: 'WRITE_IEP_MDT',
        estimatedCUs: 5,
        status: 'Approved'
      },
      {
        categoryKey: 'COMMUNITY_AWARD',
        estimatedCUs: 5,
        status: 'Denied'
      }
    ];
    const summary = buildSummary_(activities, PGS_ACTIVITY_LIBRARY);
    assertEqual_(summary.estimatedTotal, 11);
    assertEqual_(summary.estimatedRemaining, 214);
    assertEqual_(summary.approvedTotal, 5);
    assertEqual_(summary.approvedRemaining, 220);
  });

  test('Every current category has at least one official role', function() {
    PGS_ACTIVITY_LIBRARY.forEach(function(rule) {
      const roles = allowedRolesForCategory_(rule.categoryKey);
      if (!roles.length) {
        throw new Error('No official role for ' + rule.categoryKey);
      }
    });
  });

  test('Denied records are excluded from estimated totals', function() {
    const summary = buildSummary_([
      {
        categoryKey: 'GRANT_RECIPIENT',
        estimatedCUs: 30,
        status: 'Denied'
      }
    ], PGS_ACTIVITY_LIBRARY);
    assertEqual_(summary.estimatedTotal, 0);
  });

  test('Representative calculations', function() {
    assertEqual_(calculateEstimatedCUs_({paymentStatus:'unpaid', quantity:9, titleIException:'no'}, findRuleForTest_('PLC')), 3);
    assertEqual_(calculateEstimatedCUs_({paymentStatus:'paid', quantity:12, titleIException:'no'}, findRuleForTest_('PLC')), 2);
    assertEqual_(calculateEstimatedCUs_({paymentStatus:'unpaid', quantity:5, titleIException:'no'}, findRuleForTest_('WRITE_IEP_MDT')), 5);
    assertEqual_(calculateEstimatedCUs_({paymentStatus:'unpaid', quantity:3, titleIException:'no'}, findRuleForTest_('FOS_ASSIGNMENT')), 6);
    assertEqual_(calculateEstimatedCUs_({paymentStatus:'unpaid', quantity:3, unit:'semester_credit', titleIException:'no'}, findRuleForTest_('COLLEGE_APPROVED_ED')), 24);
    assertEqual_(calculateEstimatedCUs_({paymentStatus:'unpaid', quantity:1, titleIException:'no'}, findRuleForTest_('NBPTS_PROCESS')), 133);
    assertEqual_(calculateEstimatedCUs_({paymentStatus:'contract', quantity:9, titleIException:'no'}, findRuleForTest_('PLC')), 0);
    assertEqual_(calculateEstimatedCUs_({paymentStatus:'unpaid', quantity:10, unit:'ceu', titleIException:'no'}, findRuleForTest_('SPECIALTY_CEU')), '');
  });

  Logger.log(JSON.stringify(results, null, 2));
  const failed = results.filter(function(item) { return !item.passed; });
  if (failed.length) throw new Error(failed.length + ' test(s) failed. See execution log.');
  return results;
}

function findRuleForTest_(key) {
  const rule = PGS_ACTIVITY_LIBRARY.find(function(item) { return item.categoryKey === key; });
  if (!rule) throw new Error('Missing test rule: ' + key);
  return rule;
}

function assertEqual_(actual, expected) {
  if (actual !== expected) {
    throw new Error('Expected ' + expected + ' but received ' + actual);
  }
}

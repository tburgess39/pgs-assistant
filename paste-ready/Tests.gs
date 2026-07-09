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




  test('Streamlined finder has nine alphabetized starting choices', function() {
    const labels = PGS_GUIDED_FINDER.contexts.map(function(context) {
      return context.label;
    });

    assertEqual_(labels.length, 9);

    const sorted = labels.slice().sort(function(a, b) {
      return a.localeCompare(b);
    });

    assertEqual_(JSON.stringify(labels), JSON.stringify(sorted));
  });

  test('Streamlined finder still covers all 43 current categories', function() {
    const finderKeys = [];

    PGS_GUIDED_FINDER.contexts.forEach(function(context) {
      context.roles.forEach(function(role) {
        role.activities.forEach(function(activity) {
          if (activity.categoryKey &&
              finderKeys.indexOf(activity.categoryKey) === -1) {
            finderKeys.push(activity.categoryKey);
          }
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

  test('Automatic ELMS and self-reported totals remain separate', function() {
    const rules = [
      {
        active: true,
        categoryKey: 'TEST',
        parentCategory: 'Test',
        activityName: 'Test Activity',
        maximumCUs: 30
      }
    ];

    const activities = [
      {
        recordType: 'self_report',
        categoryKey: 'TEST',
        estimatedCUs: 12,
        officialApprovedCUs: 6
      },
      {
        recordType: 'automatic_elms',
        categoryKey: 'TEST',
        estimatedCUs: '',
        officialApprovedCUs: 9
      }
    ];

    const summary = buildSummary_(activities, rules);
    assertEqual_(summary.estimatedSelfReported, 12);
    assertEqual_(summary.approvedSelfReported, 6);
    assertEqual_(summary.automaticElmsTotal, 9);
    assertEqual_(summary.confirmedTotal, 15);
    assertEqual_(summary.categoryBalances[0].remaining, 15);
  });

  test('Category folders are reused and final evidence links stay separate', function() {
    const rule = findRuleForTest_('GRANT_RECIPIENT');
    if (categoryFolderName_(rule) !== 'Grant Awards') {
      throw new Error('Grant folder name is not concise.');
    }
  });

  test('May 1, 2024 cutoff is enforced', function() {
    let rejected = false;
    try {
      normalizeActivityInput_({
        title: 'Old Activity', description: 'Testing cutoff',
        categoryKey: 'PLC', paymentStatus: 'unpaid', status: 'Needs evidence',
        startDate: '2024-04-30', endDate: '2024-04-30', quantity: 3,
        unit: 'hours', titleIException: 'no'
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
        paymentStatus: 'unpaid'
      }
    ]);
    assertEqual_(sessions[0].minutes, 120);
    assertEqual_(sessions[0].hours, 2);
  });

  test('Mixed session payment statuses calculate separately', function() {
    const activity = {
      paymentStatus: 'mixed',
      quantity: 0,
      unit: 'hours',
      titleIException: 'no',
      sessions: normalizeSessions_([
        {
          date: '2026-07-08',
          startTime: '15:00',
          endTime: '18:00',
          breakMinutes: 0,
          paymentStatus: 'unpaid'
        },
        {
          date: '2026-07-09',
          startTime: '15:00',
          endTime: '18:00',
          breakMinutes: 0,
          paymentStatus: 'paid'
        }
      ])
    };
    assertEqual_(calculateEstimatedCUs_(activity, findRuleForTest_('PLC')), 1.5);
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
          paymentStatus: 'unpaid'
        }
      ]);
    } catch (error) {
      rejected = error.message.indexOf('later than') >= 0;
    }
    if (!rejected) throw new Error('Invalid session time was not rejected.');
  });

  test('Representative calculations', function() {
    assertEqual_(calculateEstimatedCUs_({paymentStatus:'unpaid', quantity:9, titleIException:'no'}, findRuleForTest_('PLC')), 3);
    assertEqual_(calculateEstimatedCUs_({paymentStatus:'paid', quantity:12, titleIException:'no'}, findRuleForTest_('PLC')), 2);
    assertEqual_(calculateEstimatedCUs_({paymentStatus:'paid', quantity:12, titleIException:'yes'}, findRuleForTest_('PLC')), 4);
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

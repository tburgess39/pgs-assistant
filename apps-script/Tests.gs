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

  test('May 1, 2024 cutoff is enforced', function() {
    let rejected = false;
    try {
      normalizeActivityInput_({
        title: 'Old Activity', description: 'Testing cutoff',
        categoryKey: 'PLC', paymentStatus: 'unpaid', status: 'Needs evidence',
        startDate: '2024-04-30', endDate: '2024-04-30', quantity: 3,
        unit: 'hours', titleIException: 'no'
      });
    } catch (error) {
      rejected = error.message.indexOf('May 1, 2024') >= 0;
    }
    if (!rejected) throw new Error('Older activity was not rejected.');
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

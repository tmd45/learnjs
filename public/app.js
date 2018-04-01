'use strict';
var learnjs = {};

learnjs.problems = [
  {
    description: "What is truth?",
    code: "function problem() { return __; }"
  },
  {
    description: "Simple Math",
    code: "function problem() { return 42 === 6 * __; }"
  }
];

learnjs.template = function (name) {
  return $('.templates .' + name).clone();
}

/**
 * @param {Object} obj Data objects array.
 * @param {*} elem View element.
 */
learnjs.applyObject = function (obj, elem) {
  for (var key in obj) {
    elem.find('[data-name="' + key + '"]').text(obj[key]);
  }
}

learnjs.flashElement = function (elem, content) {
  elem.fadeOut('fast', function () {
    elem.html(content);
    elem.fadeIn();
  });
}

learnjs.buildCorrectFlash = function (problemNum) {
  var correctFlash = learnjs.template('correct-flash');
  var link = correctFlash.find('a');
  if (problemNum < learnjs.problems.length) {
    link.attr('href', '#problem-' + (problemNum + 1));
  } else {
    link.attr('href', '');
    link.text("You're Finished!");
  }
  return correctFlash;
}

/**
 * @param {String} data Problem number string.
 */
learnjs.problemView = function (data) {
  var problemNumber = parseInt(data, 10);
  var view = learnjs.template('problem-view');
  var problemData = learnjs.problems[problemNumber - 1];
  var resultFlash = view.find('.result');

  if (problemNumber < learnjs.problems.length) {
    var buttonItem = learnjs.template('skip-btn');
    buttonItem.find('a').attr('href', '#problem-' + (problemNumber + 1));
    $('.nav-list').append(buttonItem);
    view.bind('removingView', function () {
      buttonItem.remove();
    });
  }

  function checkAnswer() {
    var def = $.Deferred();
    var answer = view.find('.answer').val();
    var test = problemData.code.replace('__', answer) + '; problem();';
    var worker = new Worker('worker.js');
    worker.onmessage = function (e) {
      if (e.data) {
        def.resolve(e.data);
      } else {
        def.reject();
      }
    }
    worker.postMessage(test);
    return def;
  }

  function checkAnswerClick() {
    checkAnswer().done(function () {
      learnjs.flashElement(resultFlash, learnjs.buildCorrectFlash(problemNumber));
    }).fail(function () {
      learnjs.flashElement(resultFlash, 'Incorrect!');
    });
    return false;
  }

  view.find('.check-btn').click(checkAnswerClick);
  view.find('.title').text('Problem #' + problemNumber);
  learnjs.applyObject(problemData, view);
  return view;
}

learnjs.landingView = function () {
  return learnjs.template('landing-view');
}

learnjs.triggerEvent = function (name, args) {
  $('.view-container>*').trigger(name, args);
}

learnjs.showView = function (hash) {
  var routes = {
    '#problem': learnjs.problemView,
    '#': learnjs.landingView,
    '': learnjs.landingView
  };
  var hashParts = hash.split('-');
  var viewFn = routes[hashParts[0]];
  if (viewFn) {
    learnjs.triggerEvent('removingView', []);
    $('.view-container').empty().append(viewFn(hashParts[1]));
  }
}

learnjs.appOnReady = function () {
  window.onhashchange = function () {
    learnjs.showView(window.location.hash);
  };
  learnjs.showView(window.location.hash);
}

/**
 * Google Sign-In
 */
function googleSignIn() {
  console.log(arguments);
}

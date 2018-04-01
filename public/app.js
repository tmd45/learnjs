'use strict';
var learnjs = {
  poolId: 'ap-northeast-1:bd71bede-1fd4-4527-aacf-9d179cd9e62b'
};

learnjs.identity = new $.Deferred();

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

learnjs.addProfileLink = function (profile) {
  var link = learnjs.template('profile-link');
  link.find('a').text(profile.email);
  $('.signin-bar').prepend(link);
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
    '#profile': learnjs.profileView,
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

learnjs.profileView = function () {
  var view = learnjs.template('profile-view');
  learnjs.identity.done(function (identity) {
    view.find('.email').text(identity.email);
  });
  return view;
}

learnjs.appOnReady = function () {
  window.onhashchange = function () {
    learnjs.showView(window.location.hash);
  };
  learnjs.showView(window.location.hash);
  learnjs.identity.done(learnjs.addProfileLink);
}

/**
 * AWS Cognito Credentials Refresh
 */
learnjs.awsRefresh = function () {
  var deferred = new $.Deferred();
  AWS.config.credentials.refresh(function (err) {
    if (err) {
      deferred.reject(err);
    } else {
      deferred.resolve(AWS.config.credentials.identityId);
    }
  });
  return deferred.promise();
}

/**
 * Google Sign-In
 */
function googleSignIn(googleUser) {
  var id_token = googleUser.getAuthResponse().id_token;
  AWS.config.update({
    region: 'ap-northeast-1',
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: learnjs.poolId,
      Logins: {
        'accounts.google.com': id_token
      }
    })
  });
  function refresh() {
    return gapi.auth2.getAuthInstance().signIn({
      prompt: 'login'
    }).then(function (userUpdate) {
      var creds = AWS.config.credentials;
      var newToken = userUpdate.getAuthResponse().id_token;
      creds.params.Logins['accounts.google.com'] = newToken;
      return learnjs.awsRefresh();
    });
  }
  learnjs.awsRefresh().then(function (id) {
    learnjs.identity.resolve({
      id: id,
      email: googleUser.getBasicProfile().getEmail(),
      refresh: refresh
    });
  });
}

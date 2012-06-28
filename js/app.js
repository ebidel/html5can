(function() {
window.requestAnimationFrame = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame ||
    window.msequestAnimationFrame || window.oRequestAnimationFrame;
window.cancelAnimationFrame = window.cancelAnimationFrame ||
    window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame ||
    window.msCancelAnimationFrame || window.oCancelAnimationFrame;

window.MutationObserver = window.MutationObserver ||
    window.WebKitMutationObserver || window.MozMutationObserver ||
    window.OMutationObserver || window.MsMutationObserver;

var transEndEventNames = {
  'WebkitTransition': 'webkitTransitionEnd',
  'MozTransition': 'transitionend',
  'OTransition': 'oTransitionEnd',
  'msTransition': 'MSTransitionEnd',
  'transition': 'transitionend'
};

var PREFIXES = {
  'webkit': 'WebKit',
  'moz': 'Moz',
  'ms': 'MS',
  'o': 'O'
};

// Find the correct transitionEnd vendor prefix.
window.transEndEventName = transEndEventNames[Modernizr.prefixed('transition')];

window.$ = function(selector, opt_scope) {
  var scope = opt_scope || document;
  return scope.querySelector(selector);
};

window.$$ = function(selector, opt_scope) {
  var scope = opt_scope || document;
  return Array.prototype.slice.call(scope.querySelectorAll(selector) || []);
};

HTMLElement.prototype.$ = function(selector) {
  return $(selector, this);
};

HTMLElement.prototype.$$ = function(selector) {
  return $$(selector, this);
};

HTMLElement.prototype.listen = HTMLElement.prototype.addEventListener;
document.listen = document.addEventListener;


// If DOM is ready, run our setup. Otherwise wait for it to finish.
if (document.readyState === 'complete') {
  initContent();
} else {
  document.listen('readystatechange', function() {
    if (document.readyState === 'complete') {
      initContent();
    }
  });
}

function addVendorPrefixes() {
  $$('[data-tooltip-property]').forEach(function(tip, i) {
    var property  = tip.dataset.tooltipProperty;

    var support = Object.keys(PREFIXES); // Default to all prefixes if support array is missing.
    var includeUnprefixedVersion = false;
    if (tip.dataset.tooltipSupport) {
      support = JSON.parse(tip.dataset.tooltipSupport);
      // A 'unprefix' in the array indicates not to include unprefixed property.
      var idx = support.indexOf('unprefixed');
      if (idx != -1) {
        includeUnprefixedVersion = true;
        support.splice(idx, 1);
      }
    }

    var str = ['/* Requires vendor prefixes. */'];

    if ('tooltipJs' in tip.dataset) {
      tip.href = 'http://caniuse.com/#search=' + property;

      support.forEach(function(prefix, i) {
        // Capitalized Properties should remain so, unless explicitly called out.
        if (property[0] == property[0].toUpperCase() &&
            !('tooltipLowercase' in tip.dataset)) {
          var val = PREFIXES[prefix] + property + '(...)';
        } else {
          var upperCasedProperty = property[0].toUpperCase() + property.substring(1);
          var val = prefix + upperCasedProperty + '(...);';
        }
        str.push(val);
      });

      if (includeUnprefixedVersion) {
        str.push(property + '(...);');
      }

    } else {
      tip.href = 'http://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html#including_a_mixin';

      support.forEach(function(prefix, i) {
        str.push('-' + prefix + '-' + property);// + ': ...');

      });
      
      str.push(property);// + ': ...'); // Include unprefixed property by default for CSS.
    }

    tip.dataset.tooltip = str.join('\n');
    tip.role = 'tooltip';
    tip.innerHTML = '<span class="property">' +
                    (!('tooltipJs' in tip.dataset) ? '+' : '') + property +
                    '</span>';
  });
}

function addBugStatus() {
  $$('.bug').forEach(function(bug, i) {
  	bug.alt = 'WebKit bug link';
  	bug.title = 'WebKit bug link';
    fetchBugStatus(bug);
  });
}

function fetchBugStatus(bug) {
  // Ignore crbugs. They don't do CORS :(
  if (!bug.href.match(/webk\.it/)) {
    return;
  }
  var url = bug.href.split('/');
  url = 'https://bugs.webkit.org/show_bug.cgi?id=' + url[url.length - 1];
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function(e) {
    var div = document.createElement('div');
    div.innerHTML = this.response;
    var status = div.$('#static_bug_status').textContent.trim();
    var isClosed = status.match(/resolved|closed|fixed/i);
    if (isClosed) {
      bug.classList.add('closed');
    }
  };
  xhr.onerror = function(e) {
    console.log(e);
  };
  xhr.send(); 
}

// DOM Ready business.
function initContent(e) {
  document.body.classList.add('loaded'); // Add loaded class for templates to use.

  if (slidedeck.slides[slidedeck.curSlide_].classList.contains('blueprint')) {
    document.body.classList.add('blueprint');
  }

  slidedeck.container.listen('slideenter', function(e) {
    var slide = e.target;
    if (slide.dataset.bodyClass) {
      document.body.classList.add(slide.dataset.bodyClass);
    }
  });

  slidedeck.container.listen('slideleave', function(e) {
    var slide = e.target;
    if (slide.dataset.bodyClass) {
      document.body.classList.remove(slide.dataset.bodyClass);
    }
  });

  var isChrome = navigator.userAgent.match(/Chrome/);
  if (!isChrome || isChrome && parseInt(navigator.userAgent.match(/Chrome\/(.*) /)[1]) < 21) {
    document.querySelector('#chrome-version-warning').style.display = 'block';
  }

  // Can't use CSS counters because counts change when slides are hidden.
  $$('.can h2').forEach(function(el, i) {
    el.dataset.canNum = ++i;
  });

  $$('[data-config-gplus]').forEach(function(el, i) {
    el.href = slidedeck.config_.presenters[0].gplus;
  });

  $$('[data-config-twitter]').forEach(function(el, i) {
    var handle = slidedeck.config_.presenters[0].twitter;
    if (!el.hasChildNodes()) {
      el.textContent = handle;
    }
    if (el.nodeName == 'A') {
      el.href = 'http://twitter.com/' + handle;
    }
  });

  $$('[data-config-www]').forEach(function(el, i) {
    var www = slidedeck.config_.presenters[0].www;
    if (!el.hasChildNodes()) {
      el.textContent = www.replace('http:\/\/www\.', '');
    }
    if (el.nodeName == 'A') {
      el.href = www;
    }
  });

  $$('[data-config-presenter-name]').forEach(function(el, i) {
    el.textContent = slidedeck.config_.presenters[0].name;
  });

  $$('[data-config-presenter-company]').forEach(function(el, i) {
    el.textContent = slidedeck.config_.presenters[0].company;
  });

  $$('[data-config-presenter-title]').forEach(function(el, i) {
    el.textContent = slidedeck.config_.presenters[0].title;
  });

  addVendorPrefixes();
  addBugStatus();

  var wrapup = document.querySelector('#wrapup ul');
  var cans = document.querySelectorAll('slide.can h2');
  for (var i = 0, can; can = cans[i]; ++i) {
    can.dataset.canNum = i + 1;
    var li = document.createElement('li');
    li.textContent = can.textContent;
    wrapup.appendChild(li);
  }
}

(function() {
  function calculateHeights() {
    // Flexbox column demo.
    $$('#flexbox-bad > div').forEach(function(el, i) {
      var h = window.getComputedStyle(el).height;
      if (h != 'auto') {
        var height = Math.round(h.split('px')[0]);

        // Remember initial height so we can reset it if coming back to this slide.
        if (!el.dataset.initialHeight) {
          el.dataset.initialHeight = height;
          el.style.minHeight = height + 'px';
        } else {
          el.style.minHeight = el.dataset.initialHeight + 'px';
        }
        
        el.dataset.height = height;
      }
    });
  }

  calculateHeights(); // Call on page load.
  
  var slide = $('#flexbox-bad').parentElement;
  slide.listen('slideenter', calculateHeights);
  slide.listen('slideleave', function(e) {
    var el = $('#flexbox-bad div:first-child');
    el.style.minHeight = el.dataset.initialHeight + 'px';
  });
})();


(function() {
  var demo = $('#flexbox-bad');
  var el = demo.$('div:first-child');
  var rafId = null;

  var onMutation = function(e) {
    var target = !e.type ? e[0].target : e.target;

    var height = Math.round(window.getComputedStyle(target).height.split('px')[0]);
    target.dataset.height = height;

    if (height > 400) {
      target.classList.add('whoops');
    } else {
      target.classList.remove('whoops');
    }
  };

  // If we have mutation observers, use them. Otherwise, bind to keyup.
  if (window.MutationObserver) {
    var observer = new MutationObserver(onMutation);
    observer.observe(el, {childList: true});
  } else {
    el.listen('keyup', onMutation);
  }

  var onTransitionEnd = function(e) {
    if (e.propertyName === 'height') {
      window.cancelAnimationFrame(rafId);
    }
  };

  demo.$$('div').forEach(function(el, i) {
    el.listen(transEndEventName, onTransitionEnd, false);
  });

  demo.listen('click', function(e) {
    var target = e.target;

    if (target.nodeName == 'DIV') {
      (function callback(time) {
        target.dataset.height = Math.round(window.getComputedStyle(target).height.split('px')[0]);
        rafId = window.requestAnimationFrame(callback);
      })();

      if (!target.previousElementSibling && target.classList.contains('active')) {
        target.contentEditable = true;
        target.classList.toggle('editable');
      }

      target.classList.toggle('active');
    }
  });
})();

(function() {
  var demo = $('#flexbox-ex2');

  demo.listen('change', function(e) {
    var target = e.target;
    demo.$('.box').style[Modernizr.prefixed(target.id)] = target.value;
  });
})();

(function() {
  var demo = $('#flexbox-ex3');

  demo.listen('change', function(e) {
  	if (e.target.nodeName == 'INPUT') {
  		var str = [];
      this.$$('input').forEach(function(input, i) {
        str.push(input.value);
      });
  		this.$('.box > :nth-child(2)').style[Modernizr.prefixed('flex')] = str.join(' ');
  	}
  });
})();

(function() {
  var demo = $('#flexbox-ex4');

  demo.listen('change', function(e) {
    var target = e.target;
    var el = null;
    if (target.id == 'order') {
      el = demo.$('.box > :nth-child(2)');
    } else if (target.id == 'flexDirection') {
      el = demo.$('.box');
      if (target.value.indexOf('column') == 0) {
        demo.$('.box').classList.add('switchmainaxis');
      } else {
        demo.$('.box').classList.remove('switchmainaxis');
      }
    }
    el.style[Modernizr.prefixed(target.id)] = target.value;
  });
})();

(function() {
  var input = document.querySelector('#data-binding-example input');
  input.dataset.value = input.value;

  input.addEventListener('change', function(e) {
    this.dataset.value = this.valueAsNumber;
  });
})();

})();

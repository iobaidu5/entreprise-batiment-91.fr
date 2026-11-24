// Contact / devis forms → BH notify backend, with reCAPTCHA v2 ("I'm not a
// robot" checkbox). Handles every form.contact_content-form on the page
// (home quick-quote, contact, devis).
//
// The token travels with the form as g-recaptcha-response and must be
// verified server-side: never call Google's siteverify from the browser.

// Resolve the redirect against the site's own base (this script lives at
// <base>assets/js/formSubmit.js), not the domain root: the site is also
// served from a sub-path (GitHub Pages preview), where "/message-envoye.html"
// would leave the site.
var SITE_BASE = ((document.currentScript && document.currentScript.src) || "")
  .replace(/assets\/js\/formSubmit\.js.*$/, "") || "/";
var FORM_REDIRECT = SITE_BASE +
  "/message-envoye.html".replace(/^\//, "");
var RECAPTCHA_SITE_KEY = "6Lfb9DAuAAAAAAOacYoiE6zxqV8jQ0Yuo4L4VPAv";

(function ($) {
  var MSG_CAPTCHA = "Veuillez cocher la case « Je ne suis pas un robot ».";
  var MSG_ERROR = "Une erreur est survenue lors de l'envoi. Veuillez réessayer " +
    "ou nous appeler au 06 68 18 72 66.";

  function respond(form, cls, text) {
    var box = form.querySelector(".form-response");
    if (!box) { return; }
    box.className = "form-response " + cls;
    box.innerHTML = text ? '<i class="fa fa-info-circle" aria-hidden="true"></i> ' + text : "";
  }

  function captchaToken(form) {
    var field = form.querySelector('[name="g-recaptcha-response"]');
    return field ? field.value : "";
  }

  function resetCaptcha(form) {
    var el = form.querySelector(".g-recaptcha");
    if (el && window.grecaptcha && el.dataset.widgetId !== undefined) {
      grecaptcha.reset(+el.dataset.widgetId);
    }
  }

  $(document).on("submit", "form.contact_content-form", function (e) {
    e.preventDefault();
    var form = this, $btn = $(form).find('[type="submit"]');
    if ($btn.prop("disabled")) { return; }            // already sending

    if (form.querySelector(".g-recaptcha") && !captchaToken(form)) {
      respond(form, "error", MSG_CAPTCHA);
      return;
    }
    respond(form, "", "");
    $btn.prop("disabled", true).addClass("is-sending");

    $.ajax({
      url: form.getAttribute("action"),
      type: "POST",
      data: $(form).serialize()           // any 2xx = sent, whatever the body
    }).done(function () {
      window.location.href = FORM_REDIRECT;
    }).fail(function () {
      respond(form, "error", MSG_ERROR);
      resetCaptcha(form);
      $btn.prop("disabled", false).removeClass("is-sending");
    });
  });
})(jQuery);

// Called by api.js?onload=CaptchaCallback&render=explicit: renders every
// widget on the page and remembers its id (needed to reset it after an error).
var CaptchaCallback = function () {
  jQuery(".g-recaptcha").each(function () {
    if (this.dataset.widgetId !== undefined) { return; }
    var form = this.closest("form");
    this.dataset.widgetId = grecaptcha.render(this, {
      sitekey: this.getAttribute("data-sitekey") || RECAPTCHA_SITE_KEY,
      callback: function () {
        var box = form && form.querySelector(".form-response.error");
        if (box) { box.className = "form-response"; box.innerHTML = ""; }
      }
    });
    fitCaptcha(this);
  });
};

// The widget is a fixed 304×78px iframe: scale it down in narrow columns
// (the home form card leaves ~200px on a 320px phone).
function fitCaptcha(el) {
  var avail = el.parentNode.clientWidth, scale = Math.min(1, avail / 304);
  el.style.transform = scale < 1 ? "scale(" + scale + ")" : "";
  el.style.height = scale < 1 ? Math.ceil(78 * scale) + "px" : "";
}
jQuery(window).on("resize", function () {
  jQuery(".g-recaptcha").each(function () { fitCaptcha(this); });
});

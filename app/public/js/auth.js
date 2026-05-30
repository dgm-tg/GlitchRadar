(function () {
  function showError(msg) {
    const el = document.getElementById('error-msg');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function hideError() {
    const el = document.getElementById('error-msg');
    if (el) el.classList.add('hidden');
  }

  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.textContent = loading ? 'Please wait…' : btn.dataset.label;
  }

  async function submitForm(form, url) {
    const btn = form.querySelector('#submit-btn');
    btn.dataset.label = btn.textContent;
    hideError();
    setLoading(btn, true);

    const data = Object.fromEntries(new FormData(form));

    try {
      const res  = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!res.ok) {
        showError(json.error || 'Something went wrong. Please try again.');
        setLoading(btn, false);
        return;
      }

      if (json.redirect) window.location.href = json.redirect;
    } catch {
      showError('Network error. Please check your connection and try again.');
      setLoading(btn, false);
    }
  }

  // Login form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitForm(loginForm, '/auth/login');
    });
  }

  // Signup form
  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitForm(signupForm, '/auth/signup');
    });
  }

  // Invite acceptance form
  const inviteForm = document.getElementById('invite-form');
  if (inviteForm) {
    inviteForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const token = inviteForm.dataset.token;
      submitForm(inviteForm, `/invite/${token}`);
    });
  }
})();

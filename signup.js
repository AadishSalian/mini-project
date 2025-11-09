document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('myForm');
  const email = document.getElementById('email');
  const password = document.getElementById('password');
  const username = document.getElementById('username');
  const emailFeedback = document.getElementById('emailFeedback');
  const passwordFeedback = document.getElementById('passwordFeedback');
  const usernameFeedback = document.getElementById('usernameFeedback');
  email.addEventListener('input', () => {
    if (email.validity.valid) {
      emailFeedback.textContent = 'Valid email!';
      emailFeedback.className = 'valid';
    } else {
      emailFeedback.textContent = 'Please enter a valid email address.';
      emailFeedback.className = 'error';
    }
  });
  password.addEventListener('input', () => {
    if (password.value.length >= 8) {
      passwordFeedback.textContent = 'Password is strong!';
      passwordFeedback.className = 'valid';
    } else {
      passwordFeedback.textContent = 'Password must be at least 8 characters long.';
      passwordFeedback.className = 'error';
    }
  });
  username.addEventListener('input', () => {
    if (username.value.length >= 3) {
      usernameFeedback.textContent = 'Username looks good!';
      usernameFeedback.className = 'valid';
    } else {
      usernameFeedback.textContent = 'Username must be at least 3 characters long.';
      usernameFeedback.className = 'error';
    }
  });
  form.addEventListener('submit', (event) => {
    if (!email.validity.valid || password.value.length < 8 || username.value.length < 3) {
      event.preventDefault();
      alert('Please fill out the form correctly before submitting.');
      return;
    }
    event.preventDefault();
    var user = { email: email.value.trim().toLowerCase(), username: username.value.trim(), password: password.value.trim() };
    if(window.__auth){ window.__auth.saveAndLogin(user); }
    else {
      try { localStorage.setItem('ver2:user', JSON.stringify(user)); localStorage.setItem('ver2:loggedIn','true'); } catch(e){}
    }
    location.href = 'index.html';
  });
});

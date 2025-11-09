document.addEventListener('DOMContentLoaded', function(){
  var form = document.getElementById('myForm');
  var username = document.getElementById('username');
  var password = document.getElementById('password');
  if(!form) return;
  form.addEventListener('submit', function(e){
    // allow HTML5 validation then handle
    if(!form.checkValidity()) return;
    e.preventDefault();
    var id = (username && username.value || '').trim();
    var pass = (password && password.value || '').trim();
    if(window.__auth && window.__auth.tryLogin(id, pass)){
      localStorage.setItem('ver2:loggedIn','true');
      location.href = 'index.html';
    } else {
      alert('Invalid credentials. If new, please sign up.');
    }
  });
});


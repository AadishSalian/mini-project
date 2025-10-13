(function(){
  'use strict';

  var USER_KEY = 'ver2:user';
  var LOGIN_KEY = 'ver2:loggedIn';

  function getUser(){
    try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch(e){ return null; }
  }
  function setUser(u){
    if(u){ localStorage.setItem(USER_KEY, JSON.stringify(u)); }
    else { localStorage.removeItem(USER_KEY); }
  }
  function isLoggedIn(){ return localStorage.getItem(LOGIN_KEY) === 'true'; }
  function setLoggedIn(v){ localStorage.setItem(LOGIN_KEY, v ? 'true' : 'false'); }

  function initNavbarAuth(){
    var navAuth = document.getElementById('navAuth');
    var featuresItem = document.getElementById('featuresItem');
    if(isLoggedIn()){
      if(featuresItem) featuresItem.style.display = '';
      if(navAuth){
        navAuth.textContent = 'Sign Out';
        navAuth.href = '#';
        navAuth.addEventListener('click', function(e){
          e.preventDefault();
          setLoggedIn(false);
          // keep any saved user, just log out
          location.href = 'index.html';
        });
      }
    } else {
      if(featuresItem) featuresItem.style.display = 'none';
      if(navAuth){
        navAuth.textContent = 'Sign In';
        navAuth.href = 'signin.html';
      }
    }
  }

  function protectFeaturePages(){
    var page = document.body && document.body.getAttribute('data-page');
    if(!page) return;
    var protectedPages = { app: true, overview: true, analytics: true };
    if(protectedPages[page] && !isLoggedIn()){
      location.href = 'signin.html';
    }
  }

  function initDropdown(){
    var toggle = document.getElementById('featuresToggle');
    var menu = document.getElementById('featuresMenu');
    if(!toggle || !menu) return;
    toggle.addEventListener('click', function(e){
      e.preventDefault();
      if(menu.style.display === 'block') menu.style.display = 'none';
      else menu.style.display = 'block';
    });
    document.addEventListener('click', function(e){
      if(!menu.contains(e.target) && e.target !== toggle){
        menu.style.display = 'none';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function(){
    initNavbarAuth();
    initDropdown();
    protectFeaturePages();
  });

  // Expose minimal helpers for signin/signup pages
  window.__auth = {
    saveAndLogin: function(user){ setUser(user); setLoggedIn(true); },
    tryLogin: function(usernameOrEmail, password){
      var u = getUser();
      if(!u) return false;
      var matchUser = (u.username && u.username.toLowerCase() === String(usernameOrEmail).toLowerCase());
      var matchEmail = (u.email && u.email.toLowerCase() === String(usernameOrEmail).toLowerCase());
      return (matchUser || matchEmail) && u.password === password;
    }
  };
})();



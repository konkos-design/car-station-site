/* Content remains readable until optional enhancements have initialized. */
(function(){
  function fallback(e){
    if(e && e.target && e.target!==window && e.target.tagName!=='SCRIPT') return;
    window.__siteFailed=true;
    document.documentElement.classList.remove('enhancements-ready');
  }
  window.addEventListener('error',fallback,true);
  window.addEventListener('unhandledrejection',fallback);
  window.addEventListener('load',function(){if(!window.__siteFailed)document.documentElement.classList.add('enhancements-ready');});
})();

/** Inline in <head> before first paint so there is no flash. Same logic as themeInitScript in the UI kits. */
export const themeInitScript = `try{var t=localStorage.getItem('theme');var d=document.documentElement;if(t==='dark')d.classList.add('dark');else if(t==='light')d.classList.add('light')}catch(e){}`

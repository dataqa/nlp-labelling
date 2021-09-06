export function getUrl(i, text) {
  const stringToTest = text.slice(i);
  const myRegexp = /^(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/g;
  const match = myRegexp.exec(stringToTest);

  return match && match.length ? match[1] : '';
}

export function debounce(func, wait, immediate) {
  let timeout;

  return function () {
    const context = this, args = arguments;
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}
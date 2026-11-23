import './page-loading';

const contents = document.querySelector<HTMLDetailsElement>('.policy-index details');
if (contents) {
  const narrow = matchMedia('(max-width: 760px)');
  const chooseLayout = () => { contents.open = !narrow.matches; };
  chooseLayout();
  narrow.addEventListener('change', chooseLayout);
}

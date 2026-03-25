import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import Quill from 'quill';

const EMPTY_DOCUMENT = '<p><br></p>';

function normalizeValue(value) {
  return value || EMPTY_DOCUMENT;
}

const QuillEditor = forwardRef(function QuillEditor(
  {
    className,
    formats,
    modules,
    onChange,
    placeholder,
    style,
    theme = 'snow',
    value = '',
  },
  ref
) {
  const editorHostRef = useRef(null);
  const editorRef = useRef(null);
  const onChangeRef = useRef(onChange);
  const initOptionsRef = useRef(null);

  if (!initOptionsRef.current) {
    initOptionsRef.current = {
      formats,
      modules,
      placeholder,
      theme,
    };
  }

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current,
  }));

  useEffect(() => {
    const hostElement = editorHostRef.current;
    if (!hostElement || editorRef.current) {
      return undefined;
    }

    const editorElement = document.createElement('div');
    hostElement.innerHTML = '';
    hostElement.appendChild(editorElement);

    const editor = new Quill(editorElement, initOptionsRef.current);

    editor.root.innerHTML = normalizeValue(value);

    const handleTextChange = () => {
      onChangeRef.current?.(editor.root.innerHTML);
    };

    editor.on('text-change', handleTextChange);
    editorRef.current = editor;

    return () => {
      editor.off('text-change', handleTextChange);
      editorRef.current = null;
      hostElement.innerHTML = '';
    };
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const nextValue = normalizeValue(value);
    if (editor.root.innerHTML !== nextValue) {
      const selection = editor.getSelection();
      editor.root.innerHTML = nextValue;
      if (selection) {
        editor.setSelection(selection);
      }
    }
  }, [value]);

  return (
    <div className={className} style={style}>
      <div ref={editorHostRef} />
    </div>
  );
});

export default QuillEditor;

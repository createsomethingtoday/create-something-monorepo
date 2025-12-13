<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EditorView, keymap, lineNumbers } from '@codemirror/view';
  import { EditorState } from '@codemirror/state';
  import { javascript } from '@codemirror/lang-javascript';
  import { oneDark } from '@codemirror/theme-one-dark';
  import { defaultKeymap, indentWithTab } from '@codemirror/commands';
  import { autocompletion } from '@codemirror/autocomplete';

  interface Props {
    initialCode?: string;
    onChange?: (code: string) => void;
    readOnly?: boolean;
    height?: string;
  }

  let {
    initialCode = '',
    onChange,
    readOnly = false,
    height = '400px'
  }: Props = $props();

  let editorContainer: HTMLDivElement;
  let editorView: EditorView | null = null;

  onMount(() => {
    const startState = EditorState.create({
      doc: initialCode,
      extensions: [
        lineNumbers(),
        javascript({ typescript: true }),
        oneDark,
        autocompletion(),
        keymap.of([...defaultKeymap, indentWithTab]),
        EditorView.editable.of(!readOnly),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onChange) {
            onChange(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': {
            height: height,
            fontSize: '14px',
            backgroundColor: '#000000',
          },
          '.cm-content': {
            fontFamily: '"Fira Code", "JetBrains Mono", monospace',
            padding: '16px 0',
          },
          '.cm-gutters': {
            backgroundColor: '#000000',
            color: 'rgba(255, 255, 255, 0.3)',
            border: 'none',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
          '.cm-activeLine': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
          '.cm-selectionBackground': {
            backgroundColor: 'rgba(255, 255, 255, 0.1) !important',
          },
          '.cm-cursor': {
            borderLeftColor: '#ffffff',
          },
        }),
      ],
    });

    editorView = new EditorView({
      state: startState,
      parent: editorContainer,
    });
  });

  onDestroy(() => {
    editorView?.destroy();
  });

  // Export method to update code programmatically
  export function setCode(code: string) {
    if (editorView) {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: code,
        },
      });
    }
  }

  // Export method to get current code
  export function getCode(): string {
    return editorView?.state.doc.toString() || '';
  }
</script>

<div
  bind:this={editorContainer}
  class="code-editor overflow-hidden"
  style="height: {height};"
></div>

<style>
  .code-editor {
    position: relative;
    border: 1px solid var(--color-border-default);
    border-radius: var(--radius-lg);
  }

  /* Ensure CodeMirror fills container */
  .code-editor :global(.cm-editor) {
    height: 100%;
  }

  .code-editor :global(.cm-scroller) {
    overflow: auto;
  }
</style>

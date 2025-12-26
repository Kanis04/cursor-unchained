<script lang="ts">
  import cursorUnchained from "$lib/assets/cursor-unchained.png";
  import { onMount, onDestroy } from "svelte";

  let testContent = $state("");
  import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api.js";
  let streamCppContent = $state("");
  let editor: Monaco.editor.IStandaloneCodeEditor | undefined =
    $state(undefined);
  let monaco: typeof Monaco;
  let editorContainer: HTMLDivElement | null = $state(null);
  let jsCode = $state("console.log('Hello from Monaco! (the editor");
  let jsTransparentCode = $state(
    "console.log('Hello from Monaco! (the editor');"
  );
  let transparentEditorContainer: HTMLDivElement | null = $state(null);
  let transparentEditor: Monaco.editor.IStandaloneCodeEditor | undefined =
    $state(undefined);
  let eventDisposables: any[] = [];
  let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

  onMount(async () => {
    monaco = (await import("./monaco")).default;
    if (editorContainer) {
      editor = monaco.editor.create(editorContainer, {
        theme: "vs-dark",
      });
      if (transparentEditorContainer) {
        transparentEditor = monaco.editor.create(transparentEditorContainer, {
          theme: "vs-dark",
        });
      }
      const model = monaco.editor.createModel(jsCode, "javascript");
      const transparentModel = monaco.editor.createModel(
        jsTransparentCode,
        "javascript"
      );
      editor.setModel(model);
      if (transparentEditor) {
        transparentEditor.setModel(transparentModel);
      }

      // Define updateCodeCompletion function inside onMount for proper scoping
      function updateCodeCompletion() {
        const currentCode =
          editor?.getModel()?.getValue().replaceAll("\n", "\\n") ?? "";
        console.log("Current Code:", currentCode);
        fetch("/api/streamCpp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: currentCode,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            const code = data.text;
            console.log("Stream Cpp:", code);

            if (transparentEditor) {
              transparentEditor
                .getModel()
                ?.setValue(code.replaceAll("\\n", "\n"));
            }
          });
      }

      // Rate limit mitigator - debounce API calls
      const DEBOUNCE_DELAY = 500; // Wait 500ms after user stops typing

      function debouncedUpdateCodeCompletion() {
        // Clear any existing timeout
        if (debounceTimeout !== null) {
          clearTimeout(debounceTimeout);
        }
        // Set a new timeout
        debounceTimeout = setTimeout(() => {
          updateCodeCompletion();
          debounceTimeout = null;
        }, DEBOUNCE_DELAY);
      }

      // Add keydown event listener
      const keyDownDisposable = editor.onKeyDown((e) => {
        console.log("Key pressed:", e.keyCode, e.browserEvent.key);

        debouncedUpdateCodeCompletion();

        // Temporarily disable tabbing - prevent default tab insertion
        if (e.browserEvent.key === "Tab" || e.keyCode === 2) {
          e.browserEvent.preventDefault();
          e.browserEvent.stopPropagation();
        }

        //if tab update code
        if (e.keyCode === 2) {
          const transparentCode =
            transparentEditor?.getModel()?.getValue() ?? "";
          editor?.getModel()?.setValue(transparentCode);
          //go to end of current line
          if (editor) {
            const editorModel = editor.getModel();
            if (editorModel) {
              const lineCount = editorModel.getLineCount();
              const lastLineLength = editorModel.getLineLength(lineCount);
              editor.setPosition({
                lineNumber: lineCount,
                column: lastLineLength + 1,
              });
            }
          }
        }
        // Add your keydown handling logic here
      });
      // Add click/mouse event listeners
      const mouseDownDisposable = editor.onMouseDown((e) => {
        console.log("Mouse clicked:", e.target.position);
        debouncedUpdateCodeCompletion();
      });

      const mouseUpDisposable = editor.onMouseUp((e) => {
        console.log("Mouse released:", e.target.position);
      });

      eventDisposables = [
        keyDownDisposable,
        mouseDownDisposable,
        mouseUpDisposable,
      ];
    }
  });

  onDestroy(() => {
    // Clear debounce timeout
    if (debounceTimeout !== null) {
      clearTimeout(debounceTimeout);
      debounceTimeout = null;
    }
    // Dispose event listeners
    eventDisposables.forEach((disposable) => disposable.dispose());
    monaco?.editor.getModels().forEach((model: any) => model.dispose());
    editor?.dispose();
  });
</script>

<div
  class="flex flex-col items-center justify-start h-screen bg-black text-white py-4"
>
  <div class="container mx-auto p-4 flex flex-col items-center justify-center">
    <enhanced:img
      src={cursorUnchained}
      alt="Cursor Unchained"
      class="w-auto h-46"
    />

    <button
      class="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-md"
      onclick={() => {
        fetch("/api/test")
          .then((response) => response.text())
          .then((data) => {
            testContent = data;
            editor?.getModel()?.setValue(jsTransparentCode);
          });
      }}>Test Button</button
    >
    <button
      class="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-md"
      onclick={() => {
        fetch("/api/streamCpp")
          .then((response) => response.text())
          .then((data) => {
            streamCppContent = data;
          });
      }}>Stream Cpp Button</button
    >
    <div id="test-content">
      {testContent}
    </div>
    <div id="streamCpp-content">
      {streamCppContent}
    </div>
    <div
      id="content"
      class="w-full max-w-[90rem] mt-4 flex justify-center items-center relative"
    >
      <div
        class="w-[90rem] h-[600px] border-6 border-gray-700 rounded-md top-0 left-0 z-20"
        bind:this={editorContainer}
      ></div>
      <div
        class="w-[90rem] h-[600px] border-6 border-gray-700 rounded-md top-0 left-0 z-10 opacity-50 z-[20] pointer-events-none"
        bind:this={transparentEditorContainer}
      ></div>
    </div>
  </div>
</div>

<style lang="postcss">
  @reference "tailwindcss";
  :global(html) {
    background-color: theme(--color-gray-100);
  }
</style>

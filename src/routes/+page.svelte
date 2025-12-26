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
  let jsCode = $state(
    "console.log('Hello from Monaco! (the editor, not the city...)')"
  );

  let eventDisposables: any[] = [];

  onMount(async () => {
    monaco = (await import("./monaco")).default;
    if (editorContainer) {
      editor = monaco.editor.create(editorContainer, {
        theme: "vs-dark",
      });
      const model = monaco.editor.createModel(jsCode, "javascript");
      editor.setModel(model);

      // Add keydown event listener
      const keyDownDisposable = editor.onKeyDown((e) => {
        console.log("Key pressed:", e.keyCode, e.browserEvent.key);
        // Add your keydown handling logic here
      });

      // Add click/mouse event listeners
      const mouseDownDisposable = editor.onMouseDown((e) => {
        console.log("Mouse clicked:", e.target.position);
        // Add your click handling logic here
      });

      const mouseUpDisposable = editor.onMouseUp((e) => {
        console.log("Mouse released:", e.target.position);
        // Add your click handling logic here
      });

      // Store disposables for cleanup
      eventDisposables = [
        keyDownDisposable,
        mouseDownDisposable,
        mouseUpDisposable,
      ];
    }
  });

  onDestroy(() => {
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
            editor?.getModel()?.setValue(data);
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
      class="w-full max-w-4xl mt-4 flex justify-center items-center"
    >
      <div
        class="w-[80rem] h-[600px] border-6 border-gray-700 rounded-md"
        bind:this={editorContainer}
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

<script lang="ts">
  import cursorUnchained from "$lib/assets/cursor-unchained.png";
  import { onMount, onDestroy } from "svelte";

  let testContent = $state("");
  import type * as Monaco from "monaco-editor/esm/vs/editor/editor.api.js";
  let streamCppContent = $state("");
  let editor: Monaco.editor.IStandaloneCodeEditor | null = $state(null);
  let monaco: typeof Monaco;
  let editorContainer: HTMLDivElement | null = $state(null);
  let jsCode = $state(
    "console.log('Hello from Monaco! (the editor, not the city...)')"
  );

  onMount(async () => {
    monaco = (await import("./monaco")).default;
    if (editorContainer) {
      const editor = monaco.editor.create(editorContainer, {
        theme: "vs-dark",
      });
      const model = monaco.editor.createModel(jsCode, "javascript");
      editor.setModel(model);
    }
  });

  onDestroy(() => {
    monaco?.editor.getModels().forEach((model: any) => model.dispose());
    (editor as any)?.dispose();
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
        bind:this={editorContainer as HTMLDivElement}
      />
    </div>
  </div>
</div>

<style lang="postcss">
  @reference "tailwindcss";
  :global(html) {
    background-color: theme(--color-gray-100);
  }
</style>

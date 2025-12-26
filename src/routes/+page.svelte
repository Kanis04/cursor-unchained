<script lang="ts">
	import cursorUnchained from '$lib/assets/cursor-unchained.png';
	let testContent = $state('');
	let streamCppContent = $state('');
</script>

<div class="flex flex-col items-center justify-start h-screen bg-black text-white py-4">
      <div class="container mx-auto p-4 flex flex-col items-center justify-center">
        <enhanced:img src={cursorUnchained} alt="Cursor Unchained" class="w-auto h-46" />

        <button class="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-md" onclick={() => {
            fetch('/api/test').then(response => response.text()).then(data => {
                testContent = data;
            });
        }}>Test Button</button>
        <button class="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-md" onclick={() => {
            fetch('/api/streamCpp').then(response => response.text()).then(data => {
                streamCppContent = data;
            });
        }}>Stream Cpp Button</button>
        <div id="test-content">
            {testContent}
        </div>
        <div id="streamCpp-content">
            {streamCppContent}
        </div>
        <div id="content" class="w-full max-w-4xl mt-4">
            <div id="editor" class="m-4"></div>
        </div>
    </div>
</div>
<style lang="postcss">
  @reference "tailwindcss";
  :global(html) {
    background-color: theme(--color-gray-100);
  }
</style>
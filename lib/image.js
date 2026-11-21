export function loadImage(src) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error('unreadable image'));
    img.src = src;
  });
}

// Wires a file input up to the canvas: hands the decoded image to `apply`, then redraws.
export async function pickImage(event, apply, draw) {
  const input = event.target, file = input.files[0];
  if (!file) return;
  try {
    apply(await loadImage(URL.createObjectURL(file)));
    draw();
  } catch {
    input.value = '';
    alert('এই ছবিটি খোলা যায়নি। JPG বা PNG ব্যবহার করুন।\nCould not open this image. Please use a JPG or PNG.');
  }
}

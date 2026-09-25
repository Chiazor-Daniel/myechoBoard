(() => {
  "use strict";
  let renderer = null, scene = null, camera = null, controls = null, root = null, pendingSnapshot = false;

  function ensureScene() {
    if (renderer) return;
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101418);
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100000);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const hemi = new THREE.HemisphereLight(0xffffff, 0x334455, 1.1);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(3, 6, 4);
    scene.add(key);
    window.addEventListener("resize", () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
    renderer.setAnimationLoop(() => {
      controls.update();
      renderer.render(scene, camera);
      if (pendingSnapshot) {
        pendingSnapshot = false;
        post("penecho-model-snapshot", { data: renderer.domElement.toDataURL("image/png") });
      }
    });
  }

  function clearModel() {
    if (root) {
      scene.remove(root);
      root = null;
    }
  }

  function fitCamera(object3d) {
    const box = new THREE.Box3().setFromObject(object3d);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3()),
      center = box.getCenter(new THREE.Vector3()),
      radius = Math.max(size.x, size.y, size.z) || 1,
      distance = radius / Math.sin((camera.fov * Math.PI / 180) / 2) * 0.9;
    camera.near = distance / 1000;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();
    camera.position.set(center.x + distance * 0.7, center.y + distance * 0.55, center.z + distance * 0.7);
    controls.target.copy(center);
    controls.update();
  }

  async function openModel(dataUrl) {
    ensureScene();
    clearModel();
    const loader = new THREE.GLTFLoader();
    loader.parse(bufferFromDataUrl(dataUrl), "", (gltf) => {
      root = gltf.scene;
      scene.add(root);
      fitCamera(root);
      post("penecho-model-loaded", {});
    }, () => post("penecho-model-error", {}));
  }

  function bufferFromDataUrl(dataUrl) {
    const base64 = String(dataUrl).split(",")[1] || "",
      binary = atob(base64),
      bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes.buffer;
  }

  function post(type, extra = {}) {
    parent.postMessage({ type, ...extra }, location.origin);
  }

  function renderSnapshot() {
    if (!renderer) return;
    pendingSnapshot = true;
  }

  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin) return;
    const data = event.data || {};
    if (data.type === "penecho-model-open" && typeof data.data === "string") {
      openModel(data.data).catch(() => post("penecho-model-error", {}));
    } else if (data.type === "penecho-model-snapshot-request") {
      renderSnapshot();
    }
  });
  post("penecho-model-ready", {});
})();

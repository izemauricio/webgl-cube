window.addEventListener("load", function () {
  setup();
});

var gl = undefined;
var canvas = undefined;
var aspectRatio;
var program;

// Vertex shader source
const vsSource = `
attribute vec4 aVertexColor;
attribute vec4 aVertexPosition;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
varying lowp vec4 vColor;

void main(void) {
  gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  vColor = aVertexColor;
}
`;

// Vertex shader source 2
const vsSource2 = `
attribute vec2 aVertexPosition;
uniform vec2 uScalingFactor;
uniform vec2 uRotationVector;

void main() {
    vec2 rotatedPosition = vec2(
        aVertexPosition.x * uRotationVector.y +
        aVertexPosition.y * uRotationVector.x,

        aVertexPosition.y * uRotationVector.y -
        aVertexPosition.x * uRotationVector.x
    );

    gl_Position = vec4(rotatedPosition * uScalingFactor, 0.0, 1.0);
}
`;

// Fragment shader source
const fsSource = `
varying lowp vec4 vColor;

void main(void) {
  gl_FragColor = vColor;
}
`;

// Position data array
// prettier-ignore
const positions = [
  // Front face
  -1.0,-1.0,1.0,
  1.0,-1.0,1.0,
  1.0,1.0,1.0,
  -1.0,1.0,1.0,

  // Back face
  -1.0, -1.0, -1.0, // red
  -1.0,  1.0, -1.0, // red
   1.0,  1.0, -1.0, // red
   1.0, -1.0, -1.0, // red

  // Top face
  -1.0,  1.0, -1.0,
  -1.0,  1.0,  1.0,
   1.0,  1.0,  1.0,
   1.0,  1.0, -1.0,

  // Bottom face
  -1.0,-1.0,-1.0,
  1.0,-1.0,-1.0,
  1.0,-1.0,1.0,
  -1.0,-1.0,1.0,

  // Right face
  1.0,-1.0,-1.0,
  1.0,1.0,-1.0,
  1.0,1.0,1.0,
  1.0,-1.0,1.0,

  // Left face
  -1.0,-1.0,-1.0,
  -1.0,-1.0,1.0,
  -1.0,1.0,1.0,
  -1.0,1.0,-1.0,
];

// Vertex color data array
// prettier-ignore
const vertexColors = [
  [0.8, 0.8, 0.8, 1.0], // Front face: white
  [0.97, 0.2, 0.1, 1.0], // Back face: red

  [0.0, 0.9, 0.1, 1.0], // Top face: green
  [0.0, 0.2, 0.9, 1.0], // Bottom face: blue

  [0.9, 0.8, 0.7, 1.0], // Right face: yellow
  [0.87, 0.1, 0.95, 1.0], // Left face: purple
];

// Index data array
// prettier-ignore
const indices = [
  0,1,2,0,2,3, // front
  4,5,6,4,6,7, // back
  8,9,10,8,10,11, // top
  12,13,14,12,14,15, // bottom
  16,17,18,16,18,19, // right
  20,21,22,20,22,23, // left
];

// Atributos addr
var vertexPositionAddr;
var vertexColorAddr;

// Uniforms addr
var modelViewMatrixAddr;
var projectionMatrixAddr;

// Buffers data
var indexBuffer;
var colorBuffer;
var positionBuffer;

// Angle amount in rads
var rotationRads = 0.0;

function setup() {
  console.log("Hi");

  canvas = document.getElementById("mycanvas");
  canvas.width = 600;
  canvas.height = 600;
  gl = canvas.getContext("webgl");
  if (!gl) {
    alert("Error browser does not support webgl");
    return;
  }

  // Gpu program
  program = gl.createProgram();

  // Vertex shader
  let vsShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsShader, vsSource);
  gl.compileShader(vsShader);
  if (!gl.getShaderParameter(vsShader, gl.COMPILE_STATUS)) {
    console.log("Erro trying compile vertex shader");
    console.log(gl.getShaderInfoLog(vsShader));
  } else {
    console.log("Vertex shader compiled");
  }

  // Fragment shader
  let fsShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsShader, fsSource);
  gl.compileShader(fsShader);
  if (!gl.getShaderParameter(fsShader, gl.COMPILE_STATUS)) {
    console.log("Erro trying compile fragment shader");
    console.log(gl.getShaderInfoLog(fsShader));
  } else {
    console.log("Fragment shader compiled");
  }

  // Anexa shaders compilados
  gl.attachShader(program, vsShader);
  gl.attachShader(program, fsShader);

  // Linka programa na gpu
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.log("Error linking shader program");
    console.log(gl.getProgramInfoLog(program));
  } else {
    console.log("Programa linkado");
  }

  // Old variables de controle
  //aspectRatio = canvas.width / canvas.height;
  //currentRotation = [0, 1];
  //currentScale = [1.0, aspectRatio];

  // Position buffer
  positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Color buffer
  var colors = [];
  for (var j = 0; j < vertexColors.length; j++) {
    const color4f = vertexColors[j];
    // 1 face do cubo tem 4 vertices, cada vertice tem 1 cor, cada cor tem 4 float32
    colors = colors.concat(color4f, color4f, color4f, color4f);
  }
  colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  // Index buffer
  indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );

  // Addr dos atributos na gpu
  vertexPositionAddr = gl.getAttribLocation(program, "aVertexPosition");
  vertexColorAddr = gl.getAttribLocation(program, "aVertexColor");

  // Addr dos uniformes na gpu
  modelViewMatrixAddr = gl.getUniformLocation(program, "uModelViewMatrix");
  projectionMatrixAddr = gl.getUniformLocation(program, "uProjectionMatrix");

  // Start loop
  requestAnimationFrame(loop);
}

var before = 0;
function loop(now) {
  now *= 0.001; // convert ms to seconds
  const dt = now - before; // now is bigger because is older
  before = now;
  render(dt);
  requestAnimationFrame(loop);
}

function render(dT) {
  gl.clearColor(0.7, 0.7, 0.7, 1.0);
  gl.clearDepth(1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // gl.viewport(0, 0, canvas.width, canvas.height);

  // Get from dom input
  const angleOfView = document.getElementById("FOV").value; // 0-360
  var xtrans = document.getElementById("XTRANSLATE").value;
  var ytrans = document.getElementById("YTRANSLATE").value;
  var ztrans = document.getElementById("ZTRANSLATE").value;
  var xangle = document.getElementById("XANGLE").value;
  var yangle = document.getElementById("YANGLE").value;
  var zangle = document.getElementById("ZANGLE").value;
  var znear = document.getElementById("ZNEAR").value;
  var zfar = document.getElementById("ZFAR").value;
  var rotx = document.getElementById("ROTX").checked ? 1 : 0;
  var roty = document.getElementById("ROTY").checked ? 1 : 0;
  var rotz = document.getElementById("ROTZ").checked ? 1 : 0;

  // Compute values
  const fieldOfView = (angleOfView * Math.PI) / 180; // deg to rad
  const xanglerad = (xangle * Math.PI) / 180; // deg to rad
  const yanglerad = (yangle * Math.PI) / 180; // deg to rad
  const zanglerad = (zangle * Math.PI) / 180; // deg to rad
  const aspectRatio = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = parseFloat(znear); // cramp near than this
  const zFar = parseFloat(zfar); // cramp far than this

  // Projection matrix
  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, fieldOfView, aspectRatio, zNear, zFar);

  // Model view matrix
  const modelViewMatrix = mat4.create();
  mat4.translate(modelViewMatrix, modelViewMatrix, [xtrans, ytrans, ztrans]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, xanglerad, [1, 0, 0]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, yanglerad, [0, 1, 0]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, zanglerad, [0, 0, 1]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, rotationRads, [
    rotx,
    roty,
    rotz,
  ]);

  // Envia position buffer para o atributo no vertex shader
  {
    const numComponents = 3;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(
      vertexPositionAddr,
      numComponents,
      type,
      normalize,
      stride,
      offset
    );
    gl.enableVertexAttribArray(vertexPositionAddr);
  }

  // Envia color buffer para o atributo no vertex shader
  {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;

    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.vertexAttribPointer(
      vertexColorAddr,
      numComponents,
      type,
      normalize,
      stride,
      offset
    );
    gl.enableVertexAttribArray(vertexColorAddr);
  }

  // Buffer de indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // Faz gpu instalar programa
  // Pode vir antes do bind de buffer
  gl.useProgram(program);

  // Envia matrix para uniformes na gpu
  gl.uniformMatrix4fv(projectionMatrixAddr, false, projectionMatrix);
  gl.uniformMatrix4fv(modelViewMatrixAddr, false, modelViewMatrix);
  //gl.uniform2fv(uScalingFactor, currentScale);
  //gl.uniform2fv(uRotationVector, currentRotation);
  //gl.uniform4fv(uGlobalColor, [0.1, 0.7, 0.2, 1.0]);

  // Tell gpu to draw all the vertex
  {
    const vertexCount = 36;
    const type = gl.UNSIGNED_SHORT;
    const offset = 0;

    // gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
    gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
  }

  rotationRads += dT;
}

// thanks https://github.com/toji/gl-matrix
const mat4 = {
  // return identity matrix
  // 1 0 0 0
  // 0 1 0 0
  // 0 0 1 0
  // 0 0 0 1
  create: () => {
    var out = new Float32Array(16);

    out[0] = 1;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;

    out[4] = 0;
    out[5] = 1;
    out[6] = 0;
    out[7] = 0;

    out[8] = 0;
    out[9] = 0;
    out[10] = 1;
    out[11] = 0;

    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;

    return out;
  },

  perspective: (out, fovy, aspect, near, far) => {
    var f = 1.0 / Math.tan(fovy / 2);

    out[0] = f / aspect;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;

    out[4] = 0;
    out[5] = f;
    out[6] = 0;
    out[7] = 0;

    out[8] = 0;
    out[9] = 0;
    // 10
    out[11] = -1;

    out[12] = 0;
    out[13] = 0;
    // 14
    out[15] = 0;

    if (far != null && far !== Infinity) {
      var nf = 1 / (near - far);
      out[10] = (far + near) * nf;
      out[14] = 2 * far * near * nf;
    } else {
      out[10] = -1;
      out[14] = -2 * near;
    }

    return out;
  },

  // Out: Destination matrix
  // A: Matrix to translate
  // V: Translation amount of each axis as [x,y,z]
  translate: (out, a, v) => {
    var x = v[0];
    var y = v[1];
    var z = v[2];

    var a00, a01, a02, a03;
    var a10, a11, a12, a13;
    var a20, a21, a22, a23;

    if (a === out) {
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
      a00 = a[0];
      a01 = a[1];
      a02 = a[2];
      a03 = a[3];

      a10 = a[4];
      a11 = a[5];
      a12 = a[6];
      a13 = a[7];

      a20 = a[8];
      a21 = a[9];
      a22 = a[10];
      a23 = a[11];

      out[0] = a00;
      out[1] = a01;
      out[2] = a02;
      out[3] = a03;

      out[4] = a10;
      out[5] = a11;
      out[6] = a12;
      out[7] = a13;

      out[8] = a20;
      out[9] = a21;
      out[10] = a22;
      out[11] = a23;

      out[12] = a00 * x + a10 * y + a20 * z + a[12];
      out[13] = a01 * x + a11 * y + a21 * z + a[13];
      out[14] = a02 * x + a12 * y + a22 * z + a[14];
      out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }
  },

  // Out: Destination matrix
  // A: Matrix to translate
  // Rad: amount to translate in radianos
  // Axis: Axis to ratote, ie: [1,1,0] to rotate around x and y axis only
  rotate: (out, a, rad, axis) => {
    var x = axis[0];
    var y = axis[1];
    var z = axis[2];

    let len = Math.hypot(x, y, z);
    if (len < 1.0) {
      return null;
    }
    len = 1 / len;
    x *= len;
    y *= len;
    z *= len;

    let s, c, t;
    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;

    let a00, a01, a02, a03;
    let a10, a11, a12, a13;
    let a20, a21, a22, a23;

    let b00, b01, b02;
    let b10, b11, b12;
    let b20, b21, b22;

    a00 = a[0];
    a01 = a[1];
    a02 = a[2];
    a03 = a[3];

    a10 = a[4];
    a11 = a[5];
    a12 = a[6];
    a13 = a[7];

    a20 = a[8];
    a21 = a[9];
    a22 = a[10];
    a23 = a[11];

    // Construct the elements of the rotation matrix
    b00 = x * x * t + c;
    b01 = y * x * t + z * s;
    b02 = z * x * t - y * s;

    b10 = x * y * t - z * s;
    b11 = y * y * t + c;
    b12 = z * y * t + x * s;

    b20 = x * z * t + y * s;
    b21 = y * z * t - x * s;
    b22 = z * z * t + c;

    // Perform rotation-specific matrix multiplication
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;

    if (a !== out) {
      // If the source and destination differ, copy the unchanged last row
      out[12] = a[12];
      out[13] = a[13];
      out[14] = a[14];
      out[15] = a[15];
    }

    return out;
  },
};

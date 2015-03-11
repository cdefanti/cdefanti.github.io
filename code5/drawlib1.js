function dot(v1, v2) {
  if (v1.x !== undefined) v1 = [v1.x, v1.y, v1.z];
  if (v2.x !== undefined) v2 = [v2.x, v2.y, v2.z];
  var sum = 0.0;
  for (var i = 0; i < v1.length; i++) {
    sum += v1[i] * v2[i];
  }
  return sum;
}
function magnitude(v) {
  var sum = 0.0;
  for (var i = 0; i < v.length; i++) {
    sum += v[i] * v[i];
  }
  return Math.sqrt(sum);
}
function normalize(v) {
  var sum = magnitude(v);
  return Vector3(v.x / sum, v.y / sum, v.z / sum);
}
function Vector3(x, y, z) {
  this.x = 0;
  this.y = 0;
  this.z = 0;
  this.set(x, y, z);
}
Vector3.prototype = {
  set : function(x, y, z) {
    if (x !== undefined) this.x = x;
    if (y !== undefined) this.y = y;
    if (z !== undefined) this.z = z;
  },
  multiplyByMat: function(mat) {
    var v = [this.x, this.y, this.z];
    var w = dot(v, [mat[3], mat[7], mat[11], mat[15]]) + 1.0;
    this.x = dot(v, [mat[0], mat[4], mat[8], mat[12]]) / w;
    this.y = dot(v, [mat[1], mat[5], mat[9], mat[13]]) / w;
    this.z = dot(v, [mat[2], mat[6], mat[10], mat[14]]) / w;
  },
}
var startTime = (new Date()).getTime() / 1000, time = startTime;
var canvases = [];
function initCanvas(id) {
  var canvas = document.getElementById(id);
  canvas.setCursor = function(x, y, z) {
    var r = this.getBoundingClientRect();
    this.cursor.set(x - r.left, y - r.top, z);
  }
  canvas.cursor = new Vector3(0, 0, 0);
  canvas.onmousedown = function(e) { this.setCursor(e.clientX, e.clientY, 1); }
  canvas.onmousemove = function(e) { this.setCursor(e.clientX, e.clientY   ); }
  canvas.onmouseup   = function(e) { this.setCursor(e.clientX, e.clientY, 0); }
  canvases.push(canvas);
  return canvas;
}
function tick() {
  time = (new Date()).getTime() / 1000 - startTime;
  for (var i = 0 ; i < canvases.length ; i++)
    if (canvases[i].update !== undefined) {
      var canvas = canvases[i];
      var g = canvas.getContext('2d');
      g.clearRect(0, 0, canvas.width, canvas.height);
      canvas.update(g);
    }
  setTimeout(tick, 1000 / 60);
}
tick();

function Matrix() {
  this.identity();
}
Matrix.prototype = {
  identity: function() {
    // Note this is col-major, so 1st data row = 1st matrix column
    this.data = [1, 0, 0, 0,
                 0, 1, 0, 0,
                 0, 0, 1, 0,
                 0, 0, 0, 1];
  },
  translate: function(x, y, z) {
    var data = [1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                x, y, z, 1];
    this.data = data;
  },
  rotateX: function(theta) {
    var data = [1, 0, 0, 0,
                0, Math.cos(theta), Math.sin(theta), 0,
                0, -Math.sin(theta), Math.cos(theta), 0,
                0, 0, 0, 1];
    this.data = data;
  },
  rotateY: function(theta) {
    var data  = [Math.cos(theta), 0, Math.sin(theta), 0,
                 0, 1, 0, 0,
                 -Math.sin(theta), 0, Math.cos(theta), 0,
                 0, 0, 0, 1];
    this.data = data;
  },
  rotateZ: function(theta) {
    var data = [Math.cos(theta), Math.sin(theta), 0, 0,
                  -Math.sin(theta), Math.cos(theta), 0, 0,
                  0, 0, 1, 0,
                  0, 0, 0, 1];
    this.data = data;
  },
  scale: function(x, y, z) {
    var data = [x, 0, 0, 0,
                0, y, 0, 0,
                0, 0, z, 0,
                0, 0, 0, 1];
    this.data = data;
  },
  multiply: function(mat) {
    var data = [];
    for (var j = 0; j < 4; j++) {
      for (var i = 0; i < 4; i++) {
        var v1 = [this.data[4 * i], this.data[4 * i + 1], this.data[4 * i + 2], this.data[4 * i + 3]];
        var v2 = [mat.data[j], mat.data[j + 4], mat.data[j + 8], mat.data[j + 12]];
        data.push(dot(v1, v2));
      }
    }
    this.data = data;
  },
  perspective: function(r, l, t, b, f, n) {
    var data = [2 * n / (r - l), 0, 0, 0,
                0, 2 * n / (t - b), 0, 0,
                (r + l) / (r - l), (t + b) / (t - b), -(f + n) / (f - n), -1,
                0, 0, - 2 * f * n / (f - n), 0];
    this.data = data;
  },
  transform: function(src, dst) {
    var w = dot(new Vector3(this.data[3], this.data[7], this.data[11]), src) + 1;
    dst.x = (dot(new Vector3(this.data[0], this.data[4], this.data[8]), src) + this.data[12]) / w;
    dst.y = (dot(new Vector3(this.data[1], this.data[5], this.data[9]), src) + this.data[13]) / w;
    dst.z = (dot(new Vector3(this.data[2], this.data[6], this.data[10]), src) + this.data[14]) / w;
  },
}

function Shape(verts, edges) {
  this.verts = [];
  this.edges = [];
  this.set(verts, edges);
}

Shape.prototype = {
  set: function(verts, edges) {
    this.verts = verts;
    this.edges = edges;
  },
  draw: function(g, width, height, mat) {
    g.beginPath();
    for (var i = 0; i < this.edges.length; i++) {
      var v0 = this.verts[this.edges[i][0]];
      var v1 = this.verts[this.edges[i][1]];
      var t_v0 = new Vector3();
      var t_v1 = new Vector3();
      mat.transform(v0, t_v0);
      mat.transform(v1, t_v1);
      var px0 = (width  / 2) + t_v0.x * (width / 2);
      var py0 = (height / 2) - t_v0.y * (width / 2);
      var px1 = (width  / 2) + t_v1.x * (width / 2);
      var py1 = (height / 2) - t_v1.y * (width / 2);
      g.moveTo(px0, py0);
      g.lineTo(px1, py1);
    }
    g.stroke();
  },
}

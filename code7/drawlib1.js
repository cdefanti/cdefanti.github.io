function dot(v2, v2) {
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
  set: function(x, y, z) {
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
    this.multiply(data);
  },
  rotateX: function(theta) {
    var data = [1, 0, 0, 0,
                0, Math.cos(theta), Math.sin(theta), 0,
                0, -Math.sin(theta), Math.cos(theta), 0,
                0, 0, 0, 1];
    this.multiply(data);
  },
  rotateY: function(theta) {
    var data  = [Math.cos(theta), 0, Math.sin(theta), 0,
                 0, 1, 0, 0,
                 -Math.sin(theta), 0, Math.cos(theta), 0,
                 0, 0, 0, 1];
    this.multiply(data);
  },
  rotateZ: function(theta) {
    var data = [Math.cos(theta), Math.sin(theta), 0, 0,
                  -Math.sin(theta), Math.cos(theta), 0, 0,
                  0, 0, 1, 0,
                  0, 0, 0, 1];
    this.multiply(data);
  },
  scale: function(x, y, z) {
    var data = [x, 0, 0, 0,
                0, y, 0, 0,
                0, 0, z, 0,
                0, 0, 0, 1];
    this.multiply(data);
  },
  multiply: function(mat) {
    var data = [];
    for (var i = 0; i < 4; i++) {
      for (var j = 0; j < 4; j++) {
        var v1 = [this.data[4 * i], this.data[4 * i + 1], this.data[4 * i + 2], this.data[4 * i + 3]];
        var v2 = [mat[j], mat[j + 4], mat[j + 8], mat[j + 12]];
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
    var w = dot([this.data[3], this.data[7], this.data[11]], src) + 1;
    dst.x = (dot([this.data[0], this.data[4], this.data[8]], src) + this.data[12]) / w;
    dst.y = (dot([this.data[1], this.data[5], this.data[9]], src) + this.data[13]) / w;
    dst.z = (dot([this.data[2], this.data[6], this.data[10]], src) + this.data[14]) / w;
  },
}

function Surface(uRes, vRes, surfaceFunction) {
  this.uRes = uRes;
  this.vRes = vRes;
  this.func = surfaceFunction;
  this.verts = [];
  this.edges = [];
  this.setEdges();
  this.setSurface();
}
Surface.prototype = {
  setEdges: function() {
    for (var i = 0; i < this.uRes; i++) {
      for (var j = 0; j < this.vRes; j++) {
        var index = j + i * this.uRes;
        var index_r = j - 1 + i * this.uRes;
        var index_d = j + (i - 1) * this.vRes;
        if (j > 0) {
          this.edges.push([index, index_r]);
        }
        if (i > 0) {
          this.edges.push([index, index_d]);
        }
      }
    }
  },
  setSurface: function() {
    this.verts = [];
    for (var i = 0; i < this.uRes; i++) {
      for (var j = 0; j < this.vRes; j++) {
        var u = i / this.uRes;
        var v = j / this.vRes;
        this.verts.push(this.func(u, v));
      }
    }
  },
  draw: function(g, width, height, mat, f) {
    var t_v0 = new Vector3(0, 0, 0);
    var t_v1 = new Vector3(0, 0, 0);
    for (var i = 0; i < this.edges.length; i++) {
      var v0 = this.verts[this.edges[i][0]];
      var v1 = this.verts[this.edges[i][1]];
      mat.transform(v0, t_v0);
      mat.transform(v1, t_v1);
      t_v0.x *= f / t_v0.z;
      t_v0.y *= f / t_v0.z;
      t_v0.z = f / t_v0.z;
      t_v1.x *= f / t_v1.z;
      t_v1.y *= f / t_v1.z;
      t_v1.z = f / t_v1.z;
      var px0 = (width  / 2) + t_v0.x * (width / 2);
      var py0 = (height / 2) - t_v0.y * (width / 2);
      var px1 = (width  / 2) + t_v1.x * (width / 2);
      var py1 = (height / 2) - t_v1.y * (width / 2);
      g.beginPath();
      g.moveTo(px0, py0);
      g.lineTo(px1, py1);
      g.stroke();
    }
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
  draw: function(g, width, height, mat, f) {
    var t_v0 = new Vector3(0, 0, 0);
    var t_v1 = new Vector3(0, 0, 0);
    for (var i = 0; i < this.edges.length; i++) {
      var v0 = this.verts[this.edges[i][0]];
      var v1 = this.verts[this.edges[i][1]];
      mat.transform(v0, t_v0);
      mat.transform(v1, t_v1);
      t_v0.x *= f / t_v0.z;
      t_v0.y *= f / t_v0.z;
      t_v0.z = f / t_v0.z;
      t_v1.x *= f / t_v1.z;
      t_v1.y *= f / t_v1.z;
      t_v1.z = f / t_v1.z;
      var px0 = (width  / 2) + t_v0.x * (width / 2);
      var py0 = (height / 2) - t_v0.y * (width / 2);
      var px1 = (width  / 2) + t_v1.x * (width / 2);
      var py1 = (height / 2) - t_v1.y * (width / 2);
      g.beginPath();
      g.moveTo(px0, py0);
      g.lineTo(px1, py1);
      g.stroke();
    }
  },
}

var ViewTypes = {
  PERSP: 0,
  RG: 1,
  GB: 2,
  BR: 3,
}
var N_STEPS = 25;

function Spline(points, charmat) {
  this.hit_index = {
    1: -1,
    2: -1,
    3: -1,
  };
  this.last_hit_index = -1;
  this.set(points, charmat);
}

Spline.prototype = {
  set: function(points, charmat) {
    this.points = points;
    if (charmat) this.charmat = charmat;
  },
  setCoeffs: function(i) {
    this.a = {r: this.points[i].r * this.charmat.data[0] + this.points[i + 1].r * this.charmat.data[4] +
             this.points[i].dr * this.charmat.data[8] + this.points[i + 1].dr * this.charmat.data[12],
             g: this.points[i].g * this.charmat.data[0] + this.points[i + 1].g * this.charmat.data[4] +
             this.points[i].dg * this.charmat.data[8] + this.points[i + 1].dg * this.charmat.data[12],
             b: this.points[i].b * this.charmat.data[0] + this.points[i + 1].b * this.charmat.data[4] +
             this.points[i].db * this.charmat.data[8] + this.points[i + 1].db * this.charmat.data[12],};
    this.b = {r: this.points[i].r * this.charmat.data[1] + this.points[i + 1].r * this.charmat.data[5] +
             this.points[i].dr * this.charmat.data[9] + this.points[i + 1].dr * this.charmat.data[13],
             g: this.points[i].g * this.charmat.data[1] + this.points[i + 1].g * this.charmat.data[5] +
             this.points[i].dg * this.charmat.data[9] + this.points[i + 1].dg * this.charmat.data[13],
             b: this.points[i].b * this.charmat.data[1] + this.points[i + 1].b * this.charmat.data[5] +
             this.points[i].db * this.charmat.data[9] + this.points[i + 1].db * this.charmat.data[13],};
    this.c = {r: this.points[i].r * this.charmat.data[2] + this.points[i + 1].r * this.charmat.data[6] +
             this.points[i].dr * this.charmat.data[10] + this.points[i + 1].dr * this.charmat.data[14],
             g: this.points[i].g * this.charmat.data[2] + this.points[i + 1].g * this.charmat.data[6] +
             this.points[i].dg * this.charmat.data[10] + this.points[i + 1].dg * this.charmat.data[14],
             b: this.points[i].b * this.charmat.data[2] + this.points[i + 1].b * this.charmat.data[6] +
             this.points[i].db * this.charmat.data[10] + this.points[i + 1].db * this.charmat.data[14],};
    this.d = {r: this.points[i].r * this.charmat.data[3] + this.points[i + 1].r * this.charmat.data[7] +
             this.points[i].dr * this.charmat.data[11] + this.points[i + 1].dr * this.charmat.data[15],
             g: this.points[i].g * this.charmat.data[3] + this.points[i + 1].g * this.charmat.data[7] +
             this.points[i].dg * this.charmat.data[11] + this.points[i + 1].dg * this.charmat.data[15],
             b: this.points[i].b * this.charmat.data[3] + this.points[i + 1].b * this.charmat.data[7] +
             this.points[i].db * this.charmat.data[11] + this.points[i + 1].db * this.charmat.data[15],};
  },
  changeConst: function(c, delta) {
    if (this.last_hit_index == -1) return;
    this.points[this.last_hit_index][c] += delta;
  },
  deletePoint: function() {
    if (this.last_hit_index == -1 || this.points.length <= 2) return;
    var new_points = [];
    for (var i = 0; i < this.points.length; i++) {
      if (i != this.last_hit_index) new_points.push(this.points[i]);
    }
    this.points = new_points;
  },
  handleMouse: function(cursor, viewtype, width, height) {
    if (cursor.z == 0) {
      this.hit_index[viewtype] = -1;
      return;
    }
    var xaxis;
    var yaxis;
    switch (viewtype) {
      case(ViewTypes.RG):
        xaxis = 'r';
        yaxis = 'g';
        break;
      case(ViewTypes.GB):
        xaxis = 'g';
        yaxis = 'b';
        break;
      case(ViewTypes.BR):
        xaxis = 'b';
        yaxis = 'r';
        break;
    }
    for (var i = 0; i < this.points.length; i++) {
      var px = this.points[i][xaxis] * width;
      var py = (1 - this.points[i][yaxis]) * height;
      if (Math.abs(cursor.x - px) < 5 && Math.abs(cursor.y - py) < 5) {
        this.hit_index[viewtype] = i;
        this.last_hit_index = i;
        break;
      }
    }
    if (this.hit_index[viewtype] != -1) {
      this.points[this.hit_index[viewtype]][xaxis] = cursor.x / width;
      this.points[this.hit_index[viewtype]][yaxis] = 1 - (cursor.y / width);
    } else {
      var new_point = {r: 0, g: 0, b: 0, dr: 0, dg: 0, db: 0};
      new_point[xaxis] = cursor.x / width;
      new_point[yaxis] = 1 - (cursor.y / width);
      this.points.push(new_point);
    }
  },
  draw: function(g, width, height, mat, f, viewtype) {
    g.strokeStyle = 'rgb(128, 128, 128)';
    g.beginPath();
    for (var i = 0; i < this.points.length; i++) {
      switch (viewtype) {
        case(ViewTypes.PERSP):
          break;
        case(ViewTypes.RG):
          var px = this.points[i].r;
          var py = this.points[i].g;
          break;
        case(ViewTypes.GB):
          var px = this.points[i].g;
          var py = this.points[i].b;
          break;
        case(ViewTypes.BR):
          var px = this.points[i].b;
          var py = this.points[i].r;
          break;
      }
      px *= width;
      py = (1 - py) * height;
      if (i == 0)
        g.moveTo(px, py);
      else
        g.lineTo(px, py);
    }
    g.stroke();
    for (var i = 0; i < this.points.length; i++) {
      switch (viewtype) {
        case(ViewTypes.PERSP):
          break;
        case(ViewTypes.RG):
          var px = this.points[i].r;
          var py = this.points[i].g;
          var dpx = this.points[i].dr;
          var dpy = this.points[i].dg;
          break;
        case(ViewTypes.GB):
          var px = this.points[i].g;
          var py = this.points[i].b;
          var dpx = this.points[i].dg;
          var dpy = this.points[i].db;
          break;
        case(ViewTypes.BR):
          var px = this.points[i].b;
          var py = this.points[i].r;
          var dpx = this.points[i].db;
          var dpy = this.points[i].dr;
          break;
      }
      px *= width;
      py = (1 - py) * height;
      dpx *= width / 10;
      dpy = (1 - dpy) * height / 10;
      if (this.last_hit_index == i) {
        g.fillStyle = "rgba(255, 0, 0, 1)";
      } else {
        g.fillStyle = "rgba(128, 128, 128, 1)";
      }
      g.beginPath();
      g.moveTo(px - 5, py - 5);
      g.lineTo(px + 5, py - 5);
      g.lineTo(px + 5, py + 5);
      g.lineTo(px - 5, py + 5);
      g.fill();
      g.strokeStyle = "rgba(255, 30, 30, 1)";
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + dpx, py + dpy, 0);
      g.stroke();
    }
    g.strokeStyle = 'rgb(255, 255, 255)';
    g.beginPath();
    for (var i = 0; i < this.points.length - 1; i++) {
      this.setCoeffs(i);
      for (var t = 0; t <= 1; t += 1 / N_STEPS) {
        switch (viewtype) {
          case(ViewTypes.PERSP):
            break;
          case(ViewTypes.RG):
            var px = this.a.r * t * t * t + this.b.r * t * t + this.c.r * t + this.d.r;
            var py = this.a.g * t * t * t + this.b.g * t * t + this.c.g * t + this.d.g;
            break;
          case(ViewTypes.GB):
            var px = this.a.g * t * t * t + this.b.g * t * t + this.c.g * t + this.d.g;
            var py = this.a.b * t * t * t + this.b.b * t * t + this.c.b * t + this.d.b;
            break;
          case(ViewTypes.BR):
            var px = this.a.b * t * t * t + this.b.b * t * t + this.c.b * t + this.d.b;
            var py = this.a.r * t * t * t + this.b.r * t * t + this.c.r * t + this.d.r;
            break;
        }
        px *= width;
        py = (1 - py) * height;
        if (t == 0) {
          g.moveTo(px, py);
        } else {
          g.lineTo(px, py);
        }
      }
    }
    g.stroke();
  },
  drawGrad: function(g, width, height) {
    for (var i = 0; i < this.points.length - 1; i++) {
      this.setCoeffs(i);
      for (var px = 0; px < width; px++) {
        var t = px / width;
        var r_color = this.a.r * t * t * t + this.b.r * t * t + this.c.r * t + this.d.r;
        var g_color = this.a.g * t * t * t + this.b.g * t * t + this.c.g * t + this.d.g;
        var b_color = this.a.b * t * t * t + this.b.b * t * t + this.c.b * t + this.d.b;
        g.strokeStyle = 'rgb(' + Math.floor(r_color * 255)  + ',' + Math.floor(g_color * 255) + ',' + Math.floor(b_color * 255) + ')';
        g.beginPath();
        g.moveTo(px, 0);
        g.lineTo(px, height);
        g.stroke();
      }
    }
  },
}

(function() {
  'use strict';

	$(document).ready(init);

	function init() {
		var canvas = $('#gl-canvas');
		var cameraCtrlBtns = $('#camera-ctrl-block');
		var textureBtns = $('#texture-box');
		var patternBtns = $('#pattern-box');
		var figureTable = $("#figure-list");

		var scene = new Scene(canvas);
		var shape = new Sphere();
		var editBox = $('#edit-mapping');
		var form = $('form', editBox);
		var options = readFormData(form);
		scene._coordsType = options['mapping'];
		loadTextureFile('images/mars.jpg', scene, shape);

		scene.animate();

		cameraCtrlBtns.on('click', '.camera-ctrl-btn', {'scene': scene}, cameraBtnsHandler);
		textureBtns.on('click', '.texture-btn', {'scene': scene}, textureBtnsHandler);
		patternBtns.on('click', '.pattern-btn', {'scene': scene}, patternBtnsHandler);
		$('#edit-mapping').on('change', {'scene': scene}, updateMappingHandler);
	}

	function updateMappingHandler(event){
		var scene = event.data.scene;
		var editBox = $('#edit-mapping');
		var form = $('form', editBox);
		var options = readFormData(form);
		if (options['mapping']){
			scene._coordsType = options['mapping'];
			scene.renderAll();
		}
	}

	function textureBtnsHandler(event){
		var scene = event.data.scene;
		var fileName = $(event.target).data('texture');
		var url = 'images/' + fileName;
		var shape = new Sphere();
		loadTextureFile(url, scene, shape);
	}

	function patternBtnsHandler(event){
		var scene = event.data.scene;
		var size = parseInt($(event.target).data('size'));
		var colorStrs = $(event.target).data('colors');
		var colors = [];
		if (colorStrs){
			colorStrs = colorStrs.split(';');
			_.each(colorStrs, function(color){
				color = tinycolor(color);
				if (color.isValid()){
					colors.push(color);
				}
			});
		}
		var shape = new Sphere();
		shape.patternImage = getCheckerBoardImg(size, colors);
		shape.patternSize = size;
		scene.addFigure(shape);
	}

	function cameraBtnsHandler(event){
		var zoomStep = 0.5;
		var rotateStep = 10;
		var elId = this.id;
		var scene = event.data.scene;
		if (elId == 'zoom-in'){
			scene.zoomCamera(zoomStep);
		}
		if (elId == 'zoom-out'){
			scene.zoomCamera(0 - zoomStep);
		}
		if (elId == 'up'){
			scene.rotateCamera(0, rotateStep);
		}
		if (elId == 'down'){
			scene.rotateCamera(0, 0 - rotateStep);
		}
		if (elId == 'left'){
			scene.rotateCamera(rotateStep, 0);
		}
		if (elId == 'right'){
			scene.rotateCamera(0 - rotateStep, 0);
		}
		if (elId == 'reset'){
			scene.resetCamera();
		}
		if (elId == 'auto'){
			scene.isAnimated = !scene.isAnimated;
		}
	}

	function readFormData(form) {
		var formData = form.serializeArray();
		var options = {};
		$.each(formData, function(index, item){
			var value = item['value'];
			options[item['name']] = item['value'];
		});
		return options;
	}

	function Scene(canvas){
		this._canvas = $(canvas);
		var gl = WebGLUtils.setupWebGL(this._canvas.get(0), {preserveDrawingBuffer: true});
		if (!gl) {alert('WebGL isn\'t available');}

		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);
		//gl.enable(gl.CULL_FACE);
		//gl.enable(gl.POLYGON_OFFSET_FILL);
		//gl.polygonOffset(1.0, 2.0);

		this._camera = new Camera();
		this._gl = gl;
		this._figures = [];
		this._program = initShaders(this._gl, 'vertex-shader', 'fragment-shader');
		this._gl.useProgram(this._program);
		this._theta = vec3(0, 0, 0);
		this._coordsType = 'spherical';
	}
	Scene.prototype.renderAll = function(program){
		var gl = this._gl,
			program = this._program,
			figures = this._figures;
		var _that = this;
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'modelViewMatrix'), false, flatten(this.getModelViewMatrix()));
		// Send normal matrix
		var normalMatrixLoc = gl.getUniformLocation(program, "normalMatrix");
		gl.uniformMatrix3fv(normalMatrixLoc, false, flatten(this.getNormalMatrix()));
		this.adjustCanvas();
		_.each(figures, function(figure){
			_that._renderFigure(figure, program);
		});
	}
	Scene.prototype.adjustCanvas = function() {
		var gl = this._gl,
			program = this._program,
			fovy = 30.0,
			near = 1.0,
			far = 50.0,
			width = gl.drawingBufferWidth,
			height = gl.drawingBufferHeight;
		var canvas = this._canvas.get(0);

		canvas.width = width;
		canvas.height = height;
		gl.viewport(0, 0, width, height);
		var projectionMatrix = perspective(fovy, width/height, near, far);
		gl.uniformMatrix4fv(gl.getUniformLocation(program, 'projectionMatrix'), false, flatten(projectionMatrix));
	}
	Scene.prototype.addFigure = function(figure){
		figure.scene = this;
		this._figures= [];
		this._figures.push(figure);
		this.renderAll();
	}
	Scene.prototype._renderFigure = function(figure){
		var gl = this._gl,
			program = this._program,
			camera = this._camera;
		var eye = camera.getEye();
		var lightPosition = vec4(30, 10, 10, 0.0);
		var lightAmbient = vec4(0.5, 0.5, 0.5, 0.1);
		var lightDiffuse = vec4(1.0, 1.0, 1.0, 0.1);
		var lightSpecular = vec4(1.0, 1.0, 1.0, 0.1);
		var materialAmbient = vec4(1.0, 1.0, 1.0, 0.1);
		var materialDiffuse = vec4(1.0, 1.0, 1.0, 0.1);
		var materialSpecular = vec4(1.0, 1.0, 1.0, 0.1);
		var materialShininess = 40.0;
		var ambientProduct = mult(lightAmbient, materialAmbient);
		var diffuseProduct = mult(lightDiffuse, materialDiffuse);
		var specularProduct = mult(lightSpecular, materialSpecular);

		var nBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(figure.getNormals()), gl.STATIC_DRAW);

		var vNormal = gl.getAttribLocation(program, "vNormal");
		gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vNormal);
		var vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(figure.getVertices()), gl.STATIC_DRAW);

		var vPosition = gl.getAttribLocation(program, "vPosition");
		gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vPosition);

		// Send lighting
		gl.uniform4fv(gl.getUniformLocation(program, "ambientProduct"), flatten(ambientProduct));
		gl.uniform4fv(gl.getUniformLocation(program, "diffuseProduct"), flatten(diffuseProduct));
		gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
		gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
		gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

		if (figure.texture) {
			this._configureTexture(figure.texture);
		}
		if (figure.patternImage && figure.patternSize){
			this._configurePattern(figure.patternImage, figure.patternSize);
		}

		var isReflection = false;
		if (isReflection) {
		} else {
			// Load index data
			var iBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(figure.getIndices()), gl.STATIC_DRAW);

			// Load texture data
			var tBuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, flatten(figure.getCoords(this._coordsType)), gl.STATIC_DRAW);

			// Associate shader variable with texture data buffer
			var vTexCoord = gl.getAttribLocation(program, 'vTexCoord');
			gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(vTexCoord);
		}

		gl.drawElements(gl.TRIANGLES, figure.getIndices().length, gl.UNSIGNED_SHORT, 0);
	}
	Scene.prototype._configurePattern = function(image, size) {
		var gl = this._gl,
			program = this._program;
		var texture = gl.createTexture();

		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.uniform1i(gl.getUniformLocation(program, 'texture'), 0);
	}
	Scene.prototype._configureTexture = function(image) {
		var gl = this._gl,
			program = this._program,
			texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.uniform1i(gl.getUniformLocation(program, 'texture'), 0);
	}
	Scene.prototype.getModelViewMatrix = function() {
		var modelMatrix = mat4(),
			theta = this._theta,
			mv;
		var viewMatrix = this._camera.getViewMatrix();

		modelMatrix = mult(modelMatrix, rotate(theta[0], [1, 0, 0]));
		modelMatrix = mult(modelMatrix, rotate(theta[1], [0, 1, 0]));
		modelMatrix = mult(modelMatrix, rotate(theta[2], [0, 0, 1]));

		mv = mult(viewMatrix, modelMatrix);

		return mv;
	}
	Scene.prototype.getNormalMatrix = function() {
		//var mv = this.getModelViewMatrix();
		var modelMatrix = mat4(),
			theta = this._theta,
			mv;
		var viewMatrix = this._camera.getViewMatrix();

		modelMatrix = mult(modelMatrix, rotate(0.0, [1, 0, 0]));
		modelMatrix = mult(modelMatrix, rotate(0.0, [0, 1, 0]));
		modelMatrix = mult(modelMatrix, rotate(0.0, [0, 0, 1]));

		mv = mult(viewMatrix, modelMatrix);
		var normalMatrix = inverseMat3(flatten(mv));
		return transpose(normalMatrix);
	}
	Scene.prototype.zoomCamera = function(value){
		this._camera.zoom(0 - value);
		this.renderAll();
	}
	Scene.prototype.resetCamera = function(phi, theta){
		this._theta = vec3(0, 0, 0);
		this._camera.resetPosition();
		this.renderAll();
	}
	Scene.prototype.rotateCamera = function(phi, theta){
		this._theta[0] = this._theta[0] + theta;
		this._theta[1] = this._theta[1] + phi;
		this.renderAll();
	}
	Scene.prototype.animate = function(){
		if (this.isAnimated){
			this.rotateCamera(-1, 0);
			this.renderAll();
		}
		var that = this;
		requestAnimationFrame(function(){
			that.animate();
		});
	}

	function Camera() {
		this.setDefaults();
	}
	Camera.prototype.setDefaults = function() {
		this.theta = 0;
		this.phi = 0;
		this.at = vec3(0.0, 0.0, 0.0);
		//this.rotation = 0.0;
		this.distance = 5;
		//this.angle = 60.0;
		this.at = vec3(0.0, 0.0, 0.0);
		this.up = vec3(0.0, 1.0, 0.0);
	}
	Camera.prototype.resetPosition = function() {
		this.setDefaults();
	}
	Camera.prototype.getEye = function() {
		var theta = this.theta,
			phi = this.phi,
			distance = this.distance;
		return vec3(
			distance * Math.sin(radians(theta)) * Math.cos(radians(phi)),
			distance * Math.sin(radians(theta)) * Math.sin(radians(phi)),
			distance * Math.cos(radians(theta))
		);
	}
	Camera.prototype.getViewMatrix = function() {
		var theta = this.theta,
			phi = this.phi,
			distance = this.distance;
		var eye = vec3(
			distance * Math.sin(radians(theta)) * Math.cos(radians(phi)),
			distance * Math.sin(radians(theta)) * Math.sin(radians(phi)),
			distance * Math.cos(radians(theta))
		);
		return lookAt(eye, this.at, this.up);
	}
	Camera.prototype.rotate = function(phi, theta) {
		this.phi = this.phi + phi;
		this.theta = this.theta + theta;
	}
	Camera.prototype.zoom = function(step){
		this.distance = this.distance + step;
		if (this.distance < 3) {
			this.distance = 3;
		}
	}


	function Figure(shape, options) {
		var _options = options || {};
		//this.shape = shape;
		//this.theta = _options['theta'] || [0, 0, 0];
		//this.scale = _options['scale'] || [0.2, 0.2, 0.2];
		//this.translate = _options['translate'] || [0, 0, 0];
		//this.indices = shape.getIndices();
		//this.vertices = shape.getVertices();
	}

	function getCheckerBoardImg(size, colors) {
		var colors = colors || [];
		var colorsLength = colors.length;
		var colorGetter = checkerBoard;
		function checkerBoard(col, row){
			var index = (((col & 0x8) == 0) ^ ((row & 0x8)  == 0));
			return colors[index];
		}
		var image = new Uint8Array(4*size*size);
		_.each(_.range(size), function(i){
			_.each(_.range(size), function(ii) {
				if (colorsLength){
					var color = colorGetter(i, ii);
				}
				else {
					var color = tinycolor.random();
				}
				var rgb = color.toRgb();
				image[4*size*i + 4*ii + 0] = rgb.r; //255 * color;
				image[4*size*i + 4*ii + 1] = rgb.g; //255 * color;
				image[4*size*i + 4*ii + 2] = rgb.b; //255 * color;
				image[4*size*i + 4*ii + 3] = 255 * 1;
			});
		});
		return image;
	};

	function loadTextureFile(textureFileUrl, scene, shape) {
		var image = new Image();
		image.src = textureFileUrl;
		image.onload = function() {
			shape.texture = image;
			scene.addFigure(shape);
		};
	};

	function Sphere(){
		this.lats = 50;
		this.longs = 50;
		this.radius = 1.0;
	}
	Sphere.prototype.getVertices = function(){
		var lats = this.lats,
			longs = this.longs,
			radius = this.radius,
			vertices = [];
		_.each(_.range(lats+1), function(latNumber){
			var theta = latNumber * Math.PI / lats;
			var sinTheta = Math.sin(theta);
			var cosTheta = Math.cos(theta);
			_.each(_.range(longs+1), function(longNumber){
				var phi = longNumber * 2 * Math.PI / longs;
				var sinPhi = Math.sin(phi);
				var cosPhi = Math.cos(phi);
				var x = cosPhi * sinTheta;
				var y = cosTheta;
				var z = sinPhi * sinTheta;
				vertices.push(radius * x);
				vertices.push(radius * y);
				vertices.push(radius * z);
			});
		});
		return vertices;
	}
	Sphere.prototype.getIndices = function(){
		var lats = this.lats,
			longs = this.longs,
			indices = [];
		_.each(_.range(lats), function(latNumber){
			var theta = latNumber * Math.PI / lats;
			var sinTheta = Math.sin(theta);
			var cosTheta = Math.cos(theta);
			_.each(_.range(longs), function(longNumber){
				var first = (latNumber * (longs+1)) + longNumber;
				var second = first + longs + 1;
				indices.push(first);
				indices.push(second);
				indices.push(first+1);
				indices.push(second);
				indices.push(second+1);
				indices.push(first+1);
			});
		});
		return indices;
	}
	Sphere.prototype.getNormals = function(){
		var lats = this.lats,
			longs = this.longs,
			normals = [];
		_.each(_.range(lats+1), function(latNumber){
			var theta = latNumber * Math.PI / lats;
			var sinTheta = Math.sin(theta);
			var cosTheta = Math.cos(theta);
			_.each(_.range(longs+1), function(longNumber){
				var phi = longNumber * 2 * Math.PI / longs;
				var sinPhi = Math.sin(phi);
				var cosPhi = Math.cos(phi);
				var x = cosPhi * sinTheta;
				var y = cosTheta;
				var z = sinPhi * sinTheta;
				normals.push(x);
				normals.push(y);
				normals.push(z);
			});
		});
		return normals;
	}
	Sphere.prototype.getSphericalCoords = function(){
		var lats = this.lats,
			longs = this.longs,
			coords = [];
		_.each(_.range(lats+1), function(latNumber){
			_.each(_.range(longs+1), function(longNumber){
				coords.push(1 - (longNumber / longs));
				coords.push(1 - (latNumber / lats));
			});
		});
		return coords;
	}
	Sphere.prototype.getPlanarCoords = function(){
		var lats = this.lats,
			longs = this.longs,
			coords = [];
		_.each(_.range(lats+1), function(latNumber){
			var theta = latNumber * Math.PI / lats;
			var sinTheta = Math.sin(theta);
			var cosTheta = Math.cos(theta);
			_.each(_.range(longs+1), function(longNumber){
				var phi = longNumber * 2 * Math.PI / longs;
				var sinPhi = Math.sin(phi);
				var cosPhi = Math.cos(phi);
				var x = cosPhi * sinTheta;
				var y = cosTheta;
				var z = sinPhi * sinTheta;
				coords.push(x);
				coords.push(y);
			});
		});
		return coords;
	}
	Sphere.prototype.getCylindricalCoords = function(){
		var lats = this.lats,
			longs = this.longs,
			coords = [];
		_.each(_.range(lats+1), function(latNumber){
			var theta = latNumber * Math.PI / lats;
			var sinTheta = Math.sin(theta);
			var cosTheta = Math.cos(theta);
			_.each(_.range(longs+1), function(longNumber){
				var phi = longNumber * 2 * Math.PI / longs;
				var cosPhi = Math.cos(phi);
				coords.push(theta);
				coords.push(cosPhi);
			});
		});
		return coords;
	}
	Sphere.prototype.getCoords = function(name){
		if (name === 'spherical') {
			return this.getSphericalCoords();
		}
		if (name === 'planar') {
			return this.getPlanarCoords();
		}
		if (name === 'cylindrical') {
			return this.getCylindricalCoords();
		}
	}

}());

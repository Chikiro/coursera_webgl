(function() {
  'use strict';

	$(document).ready(init);

	function init() {
		var canvas = $('#gl-canvas');
		var cameraCtrlBtns = $('#camera-ctrl-block');
		var addFiguresBtns = $('#add-figures-box');
		var editFigureBlock = $('#edit-figure');
		var figureTable = $("#figure-list");

		editFigureBlock.hide();

		var gl = WebGLUtils.setupWebGL(canvas.get(0), {preserveDrawingBuffer: true});
		if (!gl) {alert('WebGL isn\'t available');}

		gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
		gl.clearColor(1.0, 1.0, 1.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.CULL_FACE);

		var scene = new Scene(gl);
		scene.renderGrid();

		cameraCtrlBtns.on('click', '.camera-ctrl-btn', {'scene': scene}, cameraBtnsHandler);
		addFiguresBtns.on('click', '.figure-add-btn', {'scene': scene}, addFigureHandler);
		figureTable.on('click', '.btn-delete', {'scene': scene}, removeFigureHandler);
		figureTable.on('click', '.btn-edit', {'scene': scene}, editFigureHandler);
		$('#clear-all').on('click', {'scene': scene}, clearAllHandler);
		$('#edit-figure').on('change', {'scene': scene}, updateEditedFigureHandler);

		$(document).on("scene:figureAdd", function(event, figure, curScene) {
			var html = makeTable(curScene.getFigures());
			if (html){
				$('tbody', figureTable).html(html)
				figureTable.show();
				$('.no-figures').hide();
			}
			else {
				$('tbody', figureTable).html('')
				figureTable.hide();
				$('.no-figures').show();
			}
		});
		$(document).on("scene:figureRemove", function(event, figure, curScene) {
			var html = makeTable(curScene.getFigures());
			if (html){
				$('tbody', figureTable).html(html)
				figureTable.show();
				$('.no-figures').hide();
			}
			else {
				$('tbody', figureTable).html('')
				figureTable.hide();
				$('.no-figures').show();
			}
			$('#edit-figure').hide();
		});
	}

	function makeTable(figures){
		var result = [];
		_.each(figures, function(figure, index){
			result.push("<tr data-index=" + index +"><td class=\"col-md-2 col-lg-2\">" + (index+1) + "</td><td>" + figure.label + "</td><td class=\"col-md-3 col-lg-3 \"><div class=\"btn-group pull-right\" role=\"group\"><div class=\"btn-edit btn btn-default btn-xs\"><span class=\"glyphicon glyphicon-pencil\"></span></div><div class=\"btn-delete btn btn-default btn-xs\"><span class=\"glyphicon glyphicon-remove\"></span></div></div></td></tr>");
		});
		return result.join();
	}

	function editFigureHandler(event){
		var scene = event.data.scene;
		var ancestors = $(this).parents('tr');
		var index = parseInt($(ancestors[0]).data('index'));
		editFigureByIndex(index, scene);
	}

	function updateEditedFigureHandler(event){
		var scene = event.data.scene;
		var editBox = $('#edit-figure');
		var index = editBox.data('index');
		if (index >= 0){
			var data = readFormData();
			scene.updateFigureByIndex(index, data);
		}
	}

	function readFormData() {
		var editBox = $('#edit-figure');
		var form = $('form', editBox);
		var formData = form.serializeArray();
		var options = {};
		$.each(formData, function(index, item){
			var value = item['value'];
			if (value.startsWith('translate') || value.startsWith('scale')){
				value = parseFloat(value);
			}
			if (value.startsWith('rotate')){
				value = parseInt(value);
			}
			options[item['name']] = item['value'];
		});
		var color = tinycolor(options['color']);
		if (!color.isValid()){
			color = tinycolor('#FF0000');
		}
		options['color'] = color;
		options['translate'] = [options['translate_x'], options['translate_y'], options['translate_z']];;
		options['theta'] = [options['rotate_x'], options['rotate_y'], options['rotate_z']];
		options['scale'] = [options['scale_x'], options['scale_y'], options['scale_z']];
		return options;
	}

	function editFigureByIndex(index, scene){
		var editBox = $('#edit-figure');
		editBox.data('index', index);
		var form = $('form', editBox);
		var figures = scene.getFigures();
		var length = figures.length;
		if (length && index < length){
			editBox.data('index', index);
			var figure = figures[index];
			$('[name=color]', form).val(figure.color.toHexString());
			$('[name=rotate_x]', form).val(figure.theta[0]);
			$('[name=rotate_y]', form).val(figure.theta[1]);
			$('[name=rotate_z]', form).val(figure.theta[2]);
			$('[name=scale_x]', form).val(figure.scale[0]);
			$('[name=scale_y]', form).val(figure.scale[1]);
			$('[name=scale_z]', form).val(figure.scale[2]);
			$('[name=translate_x]', form).val(figure.translate[0]);
			$('[name=translate_y]', form).val(figure.translate[1]);
			$('[name=translate_z]', form).val(figure.translate[2]);
			editBox.show();
		}
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
	}

	function addFigureHandler(event){
		var elId = this.id;
		var scene = event.data.scene;
		if (elId == 'add-sphere'){
			var s = new Sphere(1);
			var f = new Figure(s, {'label': 'Sphere'});
			scene.addFigure(f);
		}
		if (elId == 'add-cylinder'){
			var s = new Cylinder();
			var f = new Figure(s, {'label': 'Cylinder'});
			scene.addFigure(f);
		}
		if (elId == 'add-cone'){
			var s = new Cone();
			var f = new Figure(s, {'label': 'Cone'});
			scene.addFigure(f);
		}
	}

	function removeFigureHandler(event){
		var scene = event.data.scene;
		var ancestors = $(this).parents('tr');
		var index = parseInt($(ancestors[0]).data('index'));
		scene.removeFigureByIndex(index);
	}

	function clearAllHandler(event){
		var scene = event.data.scene;
		scene.clearAll();
	}

	function createNgon(n, initAngle, radius, z){
		var vertices = [],
			dA = Math.PI*2 / n,
			r = radius,
			angle,
			x, y;
		_.each(_.range(n), function(i){
			angle = initAngle + dA*i;
			x = r * Math.cos(angle);
			y = r * Math.sin(angle);
			vertices.push(x);
			vertices.push(y);
			vertices.push(z);
		});
		return vertices;
	}

	function Figure(shape, options) {
		var _options = options || {};
		var _color = tinycolor(_options['color']);
		if (!_color.isValid()){
			//_color = tinycolor('#FF0000');
			_color = tinycolor.random();
		}
		this.color = _color;
		this.label = _options['label'] || 'new ' + this.type;
		this.shape = shape;
		this.theta = _options['theta'] || [0, 0, 0];
		this.scale = _options['scale'] || [0.2, 0.2, 0.2];
		this.translate = _options['translate'] || [0, 0, 0];
		this.indices = shape.getIndices();
		this.vertices = shape.getVertices();
	}

	function Camera() {
		//this.zoomStep = 0.5;
		//this.rotationStep = 10;
		this.modelViewMatrix = mat4();
		this.setDefaultRotation();
		this.setDefaultZoom();
	}
	Camera.prototype.setDefaultRotation = function() {
		this.theta = 0;
		this.phi = 0;
		this.dz = 0;
	}
	Camera.prototype.setDefaultZoom = function() {
		this.x = 1;
		this.y = 1;
		this.z = 1;
	}
	Camera.prototype.resetPosition = function() {
		this.setDefaultRotation();
		this.setDefaultZoom();
	}
	Camera.prototype.rotate = function(phi, theta) {
		this.phi = normalizeDegree(this.phi + phi);
		this.theta = normalizeDegree(this.theta + theta);

		function normalizeDegree(value) {
			if (value > 360) {
				return 0;
			}
			if (value < 0) {
				return 360;
			}
			return value;
		}
	}
	Camera.prototype.rotateDown = function(step){
		var _step = Math.abs(step);
		this.rotate(0, _step);
	}
	Camera.prototype.rotateUp = function(step){
		var _step = Math.abs(step);
		this.rotate(0, 0 - _step);
	}
	Camera.prototype.rotateLeft = function(step){
		var _step = Math.abs(step);
		this.rotate(0 - _step, 0);
	}
	Camera.prototype.rotateRight = function(step){
		var _step = Math.abs(step);
		this.rotate(_step, 0);
	}
	Camera.prototype.zoom = function(step) {
		this.x += step;
		this.y += step;
		this.z += step;
	}
	Camera.prototype.zoomIn = function(step) {
		var _step = Math.abs(step);
		this.zoom(step);
	}
	Camera.prototype.zoomOut = function(step) {
		var _step = Math.abs(step);
		this.zoom(0 - step);
	}
	Camera.prototype.getViewMatrix = function(){
		var ry = rotateY(this.phi);
		var rx = rotateX(this.theta);
		var s = genScaleMatrix(this.x, this.y, this.z);
		var view = mat4();
		var view = mult(view, ry);
		var view = mult(view, rx);
		var view = mult(view, s);
		return view;
	}

	function Scene(gl){
		this._camera = new Camera();
		this._gl = gl;
		this._figures = [];
		this._program = initShaders(this._gl, 'vertex-shader', 'fragment-shader');
	}
	Scene.prototype.getFigures = function(){
		return this._figures;
	}
	Scene.prototype.renderFigure = function(figure){
		var gl = this._gl;
		var camera = this._camera;
		var program = this._program;

		gl.useProgram(program);

		var iBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(figure.indices), gl.STATIC_DRAW);

		var vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(figure.vertices), gl.STATIC_DRAW);

		var vPosition = gl.getAttribLocation(program, 'vPosition');
		gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vPosition);

		var colorLoc = gl.getUniformLocation(program, 'fColor');
		var thetaLoc = gl.getUniformLocation(program, 'theta');
		var scaleLoc = gl.getUniformLocation(program, 'scale');
		var translateLoc = gl.getUniformLocation(program, 'translate');
		var modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");

		gl.uniform3fv(thetaLoc, figure.theta);
		gl.uniform3fv(scaleLoc, figure.scale);

		gl.uniform3fv(translateLoc, figure.translate);
		var rgb = figure.color.toRgb();
		gl.uniform4fv(colorLoc, vec4(rgb.r/255, rgb.g/255, rgb.b/255, rgb.a));

		gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(camera.getViewMatrix()));
		gl.drawElements(gl.LINE_LOOP, figure.indices.length, gl.UNSIGNED_SHORT, 0);
	}
	Scene.prototype.renderGrid = function(){
		var gl = this._gl;
		var camera = this._camera;
		var program = this._program;
		var grid = [];
		var size = 10;
		for(var x = -size; x <= size; ++x) {
			grid.push(vec4(x, 0, -size));
			grid.push(vec4(x, 0, size));
		}
		for(var z = -size; z <= size; ++z) {
			grid.push(vec4(-size, 0, z));
			grid.push(vec4(size, 0, z));
		}
		gl.useProgram(program);

		var vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(grid), gl.STATIC_DRAW);

		var colorLoc = gl.getUniformLocation(program, 'fColor');
		gl.uniform4fv(colorLoc, flatten(vec4(0.1, 0.1, 0.1, 1.0)));
		
		var modelViewMatrixLoc = gl.getUniformLocation(program, "modelViewMatrix");
		gl.uniformMatrix4fv(modelViewMatrixLoc, false, flatten(camera.getViewMatrix()));

		var scaleLoc = gl.getUniformLocation(program, 'scale');
		gl.uniform3fv(scaleLoc, [0.2, 0.2, 0.2]);

		var thetaLoc = gl.getUniformLocation(program, 'theta');
		gl.uniform3fv(thetaLoc, [0, 0, 0]);

		var translateLoc = gl.getUniformLocation(program, 'translate');
		gl.uniform3fv(translateLoc, [0, 0, 0]);

		var vPosition = gl.getAttribLocation(program, 'vPosition');
		gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vPosition);

		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.LINES, 0, grid.length);
	}
	Scene.prototype.renderAll = function(){
		var gl = this._gl;
		var figures = this._figures;
		var _that = this;
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		this.renderGrid();
		_.each(figures, function(figure){
			_that.renderFigure(figure);
		});
	}
	Scene.prototype.addFigure = function(figure){
		figure.scene = this;
		this._figures.push(figure);
		this.renderFigure(figure);
		$(document).trigger("scene:figureAdd", [figure, this]);
	}
	Scene.prototype.getFigureByIndex = function(index){
		var length = this._figures.length;
		if (length && index < length){
			return this._figures[index];
		}
	}
	Scene.prototype.updateFigureByIndex = function(index, data){
		var length = this._figures.length;
		if (length && index < length){
			var figure = this._figures[index];
			figure['color'] = data['color'] || figure['color'];
			figure['theta'] = data['theta'] || figure['theta'];
			figure['scale'] = data['scale'] || figure['scale'];
			figure['translate'] = data['translate'] || figure['translate'];
			this.renderAll();
		}
	}
	Scene.prototype.removeFigureByIndex = function(index){
		var length = this._figures.length;
		if (length && index < length){
			var removed = this._figures.splice(index, 1);
			if (removed.length == 1){
				this.renderAll();
				$(document).trigger("scene:figureRemove", [removed[0], this]);
			}
		}
	}
	Scene.prototype.zoomCamera = function(value){
		this._camera.zoom(value);
		this.renderAll();
	}
	Scene.prototype.resetCamera = function(phi, theta){
		this._camera.resetPosition();
		this.renderAll();
	}
	Scene.prototype.rotateCamera = function(phi, theta){
		this._camera.rotate(phi, theta);
		this.renderAll();
	}
	Scene.prototype.clearAll = function(){
		var _that = this,
			gl = this._gl;
		_.each(this._figures, function(figure){
			var index = _.indexOf(_that._figures, figure);
			_that.removeFigureByIndex(index);
		});
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		this.renderGrid();
	}

	function Sphere(radius) {
		this.radius = radius || 1;
		this.latNumber = 30;
		this.longNumber = 30;
	}
	Sphere.prototype.getIndices = function() {
		var indices = [];
		var lats = this.latNumber;
		var longs = this.longNumber;
		for (var latNumberI = 0; latNumberI < lats; ++latNumberI) {
			for (var longNumberI = 0; longNumberI < longs; ++longNumberI) {
				var first = (latNumberI * (longs+1)) + longNumberI;
				var second = first + longs + 1;
				indices.push(first);
				indices.push(second);
				indices.push(first+1);
				indices.push(second);
				indices.push(second+1);
				indices.push(first+1);
			}
		}
		return indices;
	}
	Sphere.prototype.getVertices = function(){
		var radius = this.radius;
		var lats = this.latNumber;
		var longN = this.longNumber;
		var vertices = [];
		for (var latNumber = 0; latNumber <= lats; ++latNumber) {
			for (var longI = 0; longI <= longN; ++longI) {
				var theta = latNumber * Math.PI / lats;
				var phi = longI * 2 * Math.PI / longN;
				var sinTheta = Math.sin(theta);
				var sinPhi = Math.sin(phi);
				var cosTheta = Math.cos(theta);
				var cosPhi = Math.cos(phi);
				var x = cosPhi * sinTheta;
				var y = cosTheta;
				var z = sinPhi * sinTheta;
				vertices.push(radius * x);
				vertices.push(radius * y);
				vertices.push(radius * z);
			}
		}
		return vertices;
	}

	function Cylinder(height, radius) {
		this.segmentNum = 30;
		this.radius = radius || 1;
		this.height = Math.abs(height) || 1;
	}
	Cylinder.prototype.getIndices = function() {
		var indices = [];
		var n = this.segmentNum;

		 // bottom
		_.each(_.range(n), function(i){
			indices.push(0);
			indices.push(i+1);
			if (i+2 > n) {
				indices.push(1);
			} else {
				indices.push(i+2);
			}
		});


		// side
		_.each(_.range(n+1), function(i){
			if (i + 1 > n) {
				indices.push(i);
				indices.push(1);
				indices.push(i + n + 1);

				indices.push(i);
				indices.push(1 + n + 1);
				indices.push(i + n + 1);
			}
			else {
				indices.push(i);
				indices.push(i + 1);
				indices.push(i + 1 + n + 1);
				
				indices.push(i);
				indices.push(i + n + 1);
				indices.push(i + 1 + n + 1);
			}
		});

		// top
		_.each(_.range(n), function(i){
			indices.push(n + 1);
			indices.push(i + 1 + n + 1);
			if (i+2 > n){
				indices.push(1 + n + 1);
			}
			else {
				indices.push(i + 2 + n + 1);
			}
		})

		return indices;
	}
	Cylinder.prototype._getTopZ = function(){
		return 0 - this.height;
	}
	Cylinder.prototype.getVertices = function(){
		var radius = this.radius,
			topZ = this._getTopZ(),
			bottomZ = 0.0,
			n = this.segmentNum,
			angle = 0,
			top = [0.0, 0.0, topZ],
			bottom = [0.0, 0.0, bottomZ];
		bottom = bottom.concat(createNgon(n, 0, radius, bottomZ));
		top = top.concat(createNgon(n, 0, radius, topZ));
		var result = bottom.concat(top);
		console.log(result);
		return result;
	}
	
	function Cone(height, radius) {
		this.segmentNum = 30;
		this.height = Math.abs(height) || 1;
		this.radius = radius || 1;
	}
	Cone.prototype.getIndices = function() {
		var indices = [],
			n = this.segmentNum;

		_.each(_.range(n), function(i){
			indices.push(0);
			indices.push(i+1);
			if (i+2 > n){
				indices.push(1);
			} else {
				indices.push(i+2);
			}
		});

		_.each(_.range(n), function(i){
			indices.push(n+1);
			indices.push(i+1);
			if (i+2 > n){
				indices.push(1);
			} else {
				indices.push(i+2);
			}
		})
		return indices;
	}
	Cone.prototype._getTopZ = function(){
		return 0 - this.height;
	}
	Cone.prototype.getVertices = function(){
		var topZ = this._getTopZ(),
			bottomZ = 0.0,
			bottom = [0.0, 0.0, bottomZ],
			top = [0.0, 0.0, topZ],
			angle = 1;
		bottom = bottom.concat(createNgon(this.segmentNum, angle, this.radius, bottomZ));
		return bottom.concat(top);
	}

}());

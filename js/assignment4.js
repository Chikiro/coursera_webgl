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
		//gl.clear(gl.COLOR_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);
		//gl.enable(gl.CULL_FACE);
		//gl.enable(gl.POLYGON_OFFSET_FILL);
		gl.polygonOffset(1.0, 2.0);

		var scene = new Scene(gl);
		scene.renderAll();

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
			scene.rotateCamera(0, 0 - rotateStep);
		}
		if (elId == 'down'){
			scene.rotateCamera(0, rotateStep);
		}
		if (elId == 'left'){
			scene.rotateCamera(0 - rotateStep, 0);
		}
		if (elId == 'right'){
			scene.rotateCamera(rotateStep, 0);
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
		if (elId == 'add-cube'){
			var s = new Cube();
			var f = new Figure(s, {'label': 'Cube'});
			scene.addFigure(f);
		}
		if (elId == 'add-cone'){
			var s = new Cone();
			var f = new Figure(s, {'label': 'Cone'});
			scene.addFigure(f);
		}
		var editFigureBlock = $('#edit-figure');
		editFigureBlock.hide();
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
			_color = tinycolor.random();
		}
		this.color = _color;
		this.label = _options['label'] || 'new ' + this.type;
		this.shape = shape;

		this.theta = _options['theta'] || [0, 0, 0];
		this.scale = _options['scale'] || [1, 1, 1];
		this.translate = _options['translate'] || [0, 0, 0];

		//this.indices = shape.getIndices();
		//this.vertices = shape.getVertices();
		this.triangles = shape.getTriangles();
	}
	Figure.prototype.getMatrix = function(){
		var matrix = mat4(),
			tr = this.translate,
			theta = this.theta,
			scale = this.scale;
		matrix = mult(matrix, translate(tr[0], tr[1], tr[2]));
		matrix = mult(matrix, rotate(theta[0], [1, 0, 0]));
		matrix = mult(matrix, rotate(theta[1], [0, 1, 0]));
		matrix = mult(matrix, rotate(theta[2], [0, 0, 1]));
		matrix = mult(matrix, genScaleMatrix(scale[0], scale[1], scale[2]));
		return matrix;
	}

	function LightSource(options) {
		this.options = options || {};
		this.position = this.options.position || vec4(10.0, 10.0, 10.0, 0.0);
		this.ambient = this.options.ambient || vec4(0.2, 0.2, 0.2, 1.0);
		this.diffuse = this.options.diffuse || vec4(1.0, 1.0, 1.0, 1.0);
		this.specular = this.options.specular || vec4(1.0, 1.0, 1.0, 1.0);
		//this.animated = true;
		this.theta = 0.0;
		//rotation: 'INC',
		this.distance = 0.0;
		this.attenuation = 1.0;
	}
	LightSource.prototype.getMatTransform = function() {
		var matT = translate(this.position[0], this.position[1], this.position[2]);
		var matS = genScaleMatrix(0.25, 0.25, 0.25);
		return mult(matT, matS);
	}

	function Camera() {
		this.setDefaults();
	}
	Camera.prototype.setDefaults = function() {
		this.rotation = 0.0;
		this.distance = 30;
		this.angle = 60.0;
		this.at = vec3(0.0, 0.0, 0.0);
		this.up = vec3(0.0, 1.0, 0.0);
	}
	// camera coords
	Camera.prototype.getEye = function() {
		var radius = this.distance;
		var rotationRadians = this.rotation * (Math.PI / 180);
		var angleRadians = this.angle * (Math.PI / 180);
		var x = radius * Math.sin(angleRadians) * Math.sin(rotationRadians);
		var z = radius * Math.sin(angleRadians) * Math.cos(rotationRadians);
		var y = radius * Math.cos(angleRadians);
		return vec3(x, y, z);
	}
	Camera.prototype.getMatrix = function() {
		return lookAt(this.getEye(), this.at, this.up);
	}
	Camera.prototype.resetPosition = function() {
		this.setDefaults();
	}
	Camera.prototype.zoom = function(step){
		this.distance = this.distance - step;
	}
	Camera.prototype.rotate = function(stepX, stepY){
		this.rotation = normalizeValue(this.rotation + stepX);
		this.angle = normalizeValue(this.angle + stepY);
		console.log(this.angle);
		function normalizeValue(value) {
			if (value > 360) {
				return 1;
			}
			if (value <= 0) {
				return 360;
			}
			return value;
		}
	}

	function Scene(gl){
		this._camera = new Camera();
		this._gl = gl;
		this._figures = [];
		this._program = initShaders(this._gl, 'vertex-shader', 'fragment-shader');
		this._lights = [new LightSource()];
	}
	Scene.prototype.getFigures = function(){
		return this._figures;
	}
	Scene.prototype.renderFigure = function(figure){
		var gl = this._gl;
		var camera = this._camera;
		var program = this._program;
		var projectionMatrix = perspective(45.0, 1, 1, -1);
		var colors = [
			vec4( 0.1, 0.1, 0.1, 1.0 ),  // black
			vec4( 1.0, 0.0, 0.0, 1.0 ),  // red
			vec4( 1.0, 1.0, 0.0, 1.0 ),  // yellow
			vec4( 0.0, 1.0, 0.0, 1.0 ),  // green
			vec4( 0.0, 0.0, 1.0, 1.0 ),  // blue
			vec4( 1.0, 0.0, 1.0, 1.0 ),  // magenta
			vec4( 0.0, 1.0, 1.0, 1.0 ),  // cyan
			vec4( 0.5, 0.5, 0.5, 1.0 ),  // grey
		];

		gl.useProgram(program);

		var lights = [lightCreate(), lightCreate()];
		//lights[1].enabled = false;

		var modelMatrixLoc = gl.getUniformLocation( program, "modelMatrix" );

		var projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
		gl.uniformMatrix4fv( projectionMatrixLoc, false, flatten(projectionMatrix));

		var ambientProductLoc = gl.getUniformLocation(program, "ambientProduct");
		gl.uniform4fv(ambientProductLoc, flatten(lights[0].ambient));

		var diffuseProductLoc = gl.getUniformLocation(program, "diffuseProduct");
		gl.uniform4fv(diffuseProductLoc, flatten(lights[0].diffuse));

		var specularProductLoc = gl.getUniformLocation(program, "specularProduct");
		gl.uniform4fv(specularProductLoc, flatten(lights[0].specular));

		var shininessLoc = gl.getUniformLocation(program, "shininess");
		gl.uniform1f(shininessLoc, lights[0].materialShininess);

		lights[0].positionLoc = gl.getUniformLocation(program, "lightPosition1");
		gl.uniform4fv(lights[0].positionLoc, flatten(lights[0].position));

		lights[1].positionLoc = gl.getUniformLocation(program, "lightPosition2");
		gl.uniform4fv(lights[1].positionLoc, flatten(lights[1].position));

		lights[0].enabledLoc = gl.getUniformLocation(program, "lightEnabled1");
		gl.uniform1i(lights[0].enabledLoc, lights[0].enabled);

		lights[1].enabledLoc = gl.getUniformLocation(program, "lightEnabled2");
		gl.uniform1i(lights[1].enabledLoc, lights[1].enabled);

		// Draw Lights
		for(var i = 0; i < lights.length; ++i) {
			if(lights[i].enabled) {
				gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(lights[i].matTransform));
				gl.uniform4fv(vColor, flatten(colors[lights[i].objectColor]));

				//gl.bindBuffer(gl.ARRAY_BUFFER, vBufferSphere);
				//gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
				//gl.drawArrays(gl.TRIANGLES, 0, numPointsSphere);
			}
		}

		function lightCreate() {
		  var light = {
			enabled: true,
			ambient: vec4(0.2, 0.2, 0.2, 1.0),
			diffuse: vec4(1.0, 1.0, 1.0, 1.0),
			specular: vec4(1.0, 1.0, 1.0, 1.0),
			materialShininess: 40.0,
			position: vec4(25.0, 25.0, 25.0, 0.0),
			positionLoc: null,
			enabledLoc: null,
			objectColor: 2,
			matTransform: mat4(),
			updateTransform: function () {
			  var matT = translate(light.position[0], light.position[1], light.position[2]);
			  var matS = genScaleMatrix(0.25, 0.25, 0.25);
			  light.matTransform = mult(matT, matS);
			}
		  };
		  light.updateTransform();
		  return light;
		}

		//var lights = [lightCreate(), lightCreate()];

		//var enabledLoc1 = gl.getUniformLocation(program, "lightEnabled1");
		//gl.uniform1i(enabledLoc1, 1);
		//var enabledLoc2 = gl.getUniformLocation(program, "lightEnabled2");
		//gl.uniform1i(enabledLoc2, 0);

		var vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(figure.triangles), gl.STATIC_DRAW);

		var vPosition = gl.getAttribLocation(program, "vPosition");
		gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vPosition);

		var modelMatrixLoc = gl.getUniformLocation(program, "modelMatrix");
		gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(figure.getMatrix()));

		var projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix" );
		gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

		this.renderCamera();

		var vColor = gl.getUniformLocation(program, "vColor");
		var rgb = figure.color.toRgb();
		gl.uniform4fv(vColor, vec4(rgb.r/255, rgb.g/255, rgb.b/255, rgb.a));

		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.TRIANGLES, 0, figure.triangles.length);

	}
	Scene.prototype.animate = function(){
		this.rotateCamera(0, 10);
	}
	Scene.prototype.renderAll = function(){
		var gl = this._gl;
		var figures = this._figures;
		var _that = this;
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		this.renderDefaults();
		this.renderCamera();
		_.each(figures, function(figure){
			_that.renderFigure(figure);
		});
	}
	Scene.prototype.renderDefaults = function(){
		this.renderGrid();
	}
	Scene.prototype.renderGrid = function(){
		var gl = this._gl;
		var camera = this._camera;
		var program = this._program;
		var grid = [];
		var size = 8;
		for(var x = -size; x <= size; ++x) {
			grid.push(vec4(x, 0, -size));
			grid.push(vec4(x, 0, size));
		}
		for(var z = -size; z <= size; ++z) {
			grid.push(vec4(-size, 0, z));
			grid.push(vec4(size, 0, z));
		}

		gl.useProgram(program);

		var projectionMatrix = perspective(45.0, 1, 1, -1);

		var vBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, flatten(grid), gl.STATIC_DRAW);

		var vColor = gl.getUniformLocation(program, "vColor");
		gl.uniform4fv(vColor, flatten(vec4(1.0, 1.0, 1.0, 1.0)));
		var colorLoc = gl.getUniformLocation(program, 'fColor');
		gl.uniform4fv(colorLoc, flatten(vec4(0.1, 0.1, 0.1, 1.0)));

		var modelMatrixLoc = gl.getUniformLocation(program, "modelMatrix");
		gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(mat4()));

		var projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
		gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

		var viewMatrixLoc = gl.getUniformLocation(program, "viewMatrix");
		gl.uniformMatrix4fv(viewMatrixLoc, false, flatten(camera.getMatrix()));

		var cameraPositionLoc = gl.getUniformLocation(program, "cameraPosition");
		gl.uniform4fv(cameraPositionLoc, flatten(vec4(camera.getEye())));

		var enabledLoc1 = gl.getUniformLocation(program, "lightEnabled1");
		gl.uniform1i(enabledLoc1, 0);
		var enabledLoc2 = gl.getUniformLocation(program, "lightEnabled2");
		gl.uniform1i(enabledLoc2, 0);

		var vPosition = gl.getAttribLocation(program, 'vPosition');
		gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(vPosition);

		gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
		gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
		gl.drawArrays(gl.LINES, 0, grid.length);
	}
	Scene.prototype.renderCamera = function() {
		var gl = this._gl;
		var camera = this._camera;
		var program = this._program;
		var viewMatrixLoc = gl.getUniformLocation(program, "viewMatrix");
		gl.uniformMatrix4fv(viewMatrixLoc, false, flatten(camera.getMatrix()));

		var cameraPositionLoc = gl.getUniformLocation(program, "cameraPosition");
		gl.uniform4fv(cameraPositionLoc, flatten(vec4(camera.getEye())));
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
		this.renderDefaults();
	}

	function Sphere(radius) {
		this.radius = radius || 1;
		//this.latNumber = 30;
		//this.longNumber = 30;
	}
	Sphere.prototype.getTriangles = function() {
		var results = [];
		var divisions = 5;
		function triangle(points, a, b, c) {
			points.push(a);
			points.push(b);
			points.push(c);
		}
		function divideTriangle(points, a, b, c, count) {
			if (count > 0) {
				var ab = mix(a, b, 0.5);
				var ac = mix(a, c, 0.5);
				var bc = mix(b, c, 0.5);

				ab = normalize(ab, true);
				ac = normalize(ac, true);
				bc = normalize(bc, true);

				divideTriangle(points, a, ab, ac, count-1);
				divideTriangle(points, ab, b, bc, count-1);
				divideTriangle(points, bc, c, ac, count-1);
				divideTriangle(points, ab, bc, ac, count-1);
			}
			else {
				triangle(points, a, b, c);
			}
		}
		var va = vec4(0.0, 0.0, -1.0);
		var vb = vec4(0.0, 0.942809, 0.333333);
		var vc = vec4(-0.816497, -0.471405, 0.333333);
		var vd = vec4(0.816497, -0.471405, 0.333333);

		divideTriangle(results, va, vb, vc, divisions);
		divideTriangle(results, vd, vc, vb, divisions);
		divideTriangle(results, va, vd, vb, divisions);
		divideTriangle(results, va, vc, vd, divisions);
		return results;
	}

	function Cylinder(height, radius) {
		this.segmentNum = 50;
		this.radius = radius || 1;
		this.height = Math.abs(height) || 1;
	}
	Cylinder.prototype.getTriangles = function() {
		var triangles = [];
		var divisions = this.segmentNum;
		var r = this.radius;
		for(var i = 0; i < divisions; ++i) {
			console.log(i);
			var theta = i/divisions * 2*Math.PI;
			var ntheta = (i+1)/divisions * 2*Math.PI;
			// bottom
			triangles.push(vec4(0, -r, 0));
			triangles.push(vec4(r*Math.cos(theta), -r, r*Math.sin(theta)));
			triangles.push(vec4(r*Math.cos(ntheta), -r, r*Math.sin(ntheta)));
			// top
			triangles.push(vec4(0, r, 0));
			triangles.push(vec4(r*Math.cos(theta), r, r*Math.sin(theta)));
			triangles.push(vec4(r*Math.cos(ntheta), r, r*Math.sin(ntheta)));

			// cone sides
			for(var j = 0; j < divisions; ++j) {
				var p1 = (divisions-j)/divisions;
				var p2 = (divisions-(j+1))/divisions;
				var y1 = r - (2*r * p1);
				var y2 = r - (2*r * p2);

				triangles.push(vec4(r*Math.cos(theta), y1, r*Math.sin(theta)));
				triangles.push(vec4(r*Math.cos(ntheta), y1, r*Math.sin(ntheta)));
				triangles.push(vec4(r*Math.cos(theta), y2, r*Math.sin(theta)));

				triangles.push(vec4(r*Math.cos(theta), y2, r*Math.sin(theta)));
				triangles.push(vec4(r*Math.cos(ntheta), y2, r*Math.sin(ntheta)));
				triangles.push(vec4(r*Math.cos(ntheta), y1, r*Math.sin(ntheta)));
			}
		}
		return triangles;
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
	Cone.prototype.getNormals = function(){
		var vertices = [],
        uniqueNormals = [],
        normals = [],
        n = this.segmentNum,
        startAngle = 1,
        tn;
        var vertices = this.getVertices();

      // bottom
      
		_.each(_.range(n), function(i){
			normals.push(vec3(0.0, -1.0, 0.0));
			normals.push(vec3(0.0, -1.0, 0.0));
			normals.push(vec3(0.0, -1.0, 0.0));
		});

      // Initialize unique normals with zero vectors
      for (var kn=0; kn<=uniqueVertices.length; kn++) {
        uniqueNormals[kn] = vec3(0.0, 0.0, 0.0);
      }

      // Join top point to bottom cap
      for (var j=1; j<=n; j++) {

        // Special handling to "wrap it up"
        if (j === n) {

          tn = ShapeCommon.computeNormal(uniqueVertices[n+1], uniqueVertices[j], uniqueVertices[1]);
          uniqueNormals[n+1] = add(tn, uniqueNormals[n+1]);
          uniqueNormals[j] = add(tn, uniqueNormals[j]);
          uniqueNormals[1] = add(tn, uniqueNormals[1]);

        } else {
          tn = ShapeCommon.computeNormal(uniqueVertices[n+1], uniqueVertices[j], uniqueVertices[j+1]);
          uniqueNormals[n+1] = add(tn, uniqueNormals[n+1]);
          uniqueNormals[j] = add(tn, uniqueNormals[j]);
          uniqueNormals[j+1] = add(tn, uniqueNormals[j+1]);
        }
      }

      // Normalize unique normals
      for (var knn=0; knn<uniqueNormals.length; knn++) {
        var curNormal = uniqueNormals[knn];
        var nn = normalize(curNormal);
        uniqueNormals[knn] = nn;
      }

      // Fill normals array with unique normals
      for (var j2=1; j2<=n; j2++) {
        if (j === n) {
          normals.push(uniqueNormals[n+1]);
          normals.push(uniqueNormals[j2]);
          normals.push(uniqueNormals[1]);
        } else {
          normals.push(uniqueNormals[n+1]);
          normals.push(uniqueNormals[j2]);
          normals.push(uniqueNormals[j2+1]);
        }
      }

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
	function Material(ambient, diffuse, specular, shininess){
		this.ambient = ambient || [0.0, 0.0, 0.0, 1.0];
		this.diffuse = diffuse || [0.0, 0.0, 0.0, 1.0];
		this.specular = specular || [0.0, 0.0, 0.0, 1.0],
		this.shininess = shininess || 10;
	}

var MaterialType = {
    "Brass":            {
                        ambient: [0.329412, 0.223529, 0.027451, 1.0],
                        diffuse: [0.780392, 0.568627, 0.113725, 1.0],
                        specular: [0.992157, 0.941176, 0.807843, 1.0],
                        shinines: 27.8974
                        },
    "Bronze":           {
                        ambient: [0.2125, 0.1275, 0.054, 1.0],
                        diffuse: [0.714, 0.4284, 0.18144, 1.0],
                        specular: [ 0.393548, 0.271906, 0.166721, 1.0],
                        shinines: 25.6
                        },
    "Polished Bronze":  {
                        ambient: [0.25, 0.148, 0.06475, 1.0],
                        diffuse: [0.4, 0.2368, 0.1036, 1.0],
                        specular: [0.774597, 0.458561, 0.200621, 1.0],
                        shinines: 76.8
                        },
    "Chrome":           {
                        ambient: [0.25, 0.25, 0.25, 1.0],
                        diffuse: [0.4, 0.4, 0.4, 1.0],
                        specular: [0.774597, 0.774597, 0.774597, 1.0],
                        shinines: 76.8
                        },
    "Copper":           {
                        ambient: [0.19125, 0.0735, 0.0225, 1.0],
                        diffuse: [0.7038, 0.27048, 0.0828, 1.0],
                        specular: [0.256777, 0.137622, 0.086014, 1.0],
                        shinines: 12.8
                        },
    "Polished Copper":  {
                        ambient: [0.2295, 0.08825, 0.0275, 1.0],
                        diffuse: [0.5508, 0.2118, 0.066, 1.0],
                        specular: [0.580594, 0.223257, 0.0695701, 1.0],
                        shinines: 51.2
                        },
    "Gold":             {
                        ambient: [0.24725, 0.1995, 0.0745, 1.0],
                        diffuse: [0.75164, 0.60648, 0.22648, 1.0],
                        specular: [0.628281, 0.555802, 0.366065, 1.0],
                        shinines: 51.2
                        },
    "Polished gold":    {
                        ambient: [0.24725, 0.2245, 0.0645, 1.0],
                        diffuse: [0.34615, 0.3143, 0.0903, 1.0],
                        specular: [ 0.797357, 0.723991, 0.208006, 1.0],
                        shinines: 83.2
                        },
    "Tin":              {
                        ambient: [0.105882, 0.058824, 0.113725, 1.0],
                        diffuse: [0.427451, 0.470588, 0.541176, 1.0],
                        specular: [0.333333, 0.333333, 0.521569, 1.0],
                        shinines: 9.84615
                        },
    "Silver":           {
                        ambient: [0.19225, 0.19225, 0.19225, 1.0],
                        diffuse: [0.50754, 0.50754, 0.50754, 1.0],
                        specular: [0.508273, 0.508273, 0.508273, 1.0],
                        shinines: 51.2
                        },
    "Polished silver":  {
                        ambient: [0.23125, 0.23125, 0.23125, 1.0],
                        diffuse: [0.2775, 0.2775, 0.2775, 1.0],
                        specular: [0.773911, 0.773911, 0.773911, 1.0],
                        shinines: 89.6
                        },
    "Emerald":          {
                        ambient: [0.0215, 0.1745, 0.0215, 0.55],
                        diffuse: [0.07568, 0.61424, 0.07568, 0.55],
                        specular: [0.633, 0.727811, 0.633, 0.55],
                        shinines: 76.8
                        },
    "Jade":             {
                        ambient: [0.135, 0.2225, 0.1575, 0.95],
                        diffuse: [0.54, 0.89, 0.63, 0.95],
                        specular: [0.316228, 0.316228, 0.316228, 0.95],
                        shinines: 12.8
                        },
    "Obsidian":         {
                        ambient: [0.05375, 0.05, 0.06625, 0.82],
                        diffuse: [0.18275, 0.17, 0.22525, 0.82],
                        specular: [0.332741, 0.328634, 0.346435, 0.82],
                        shinines: 38.4
                        },
    "Perl":             {
                        ambient: [0.25, 0.20725, 0.20725, 0.922],
                        diffuse: [1.0, 0.829, 0.829, 0.922],
                        specular: [0.296648, 0.296648, 0.296648, 0.922],
                        shinines: 11.264
                        },
    "Ruby":             {
                        ambient: [0.1745, 0.01175, 0.01175, 0.55],
                        diffuse: [0.61424, 0.04136, 0.04136, 0.55],
                        specular: [0.727811, 0.626959, 0.626959, 0.55],
                        shinines: 76.8
                        },
    "Turquoise":        {    
                        ambient: [0.1, 0.18725, 0.1745, 0.8],
                        diffuse: [0.396, 0.74151, 0.69102, 0.8],
                        specular: [0.297254, 0.30829, 0.306678, 0.8],
                        shinines: 12.8
                        },
    "Black Plastic":    {
                        ambient: [0.0, 0.0, 0.0, 1.0],
                        diffuse: [0.01, 0.01, 0.01, 1.0],
                        specular: [0.50, 0.50, 0.50, 1.0],
                        shinines: 32.0
                        },
    "Cyan Plastic":     {
                        ambient: [0.0, 0.1, 0.06,1.0],
                        diffuse: [0.0, 0.50980392, 0.50980392, 1.0],
                        specular: [0.50196078, 0.50196078, 0.50196078, 1.0],
                        shinines: 32.0
                        },
    "Green Plastic":    {
                        ambient: [0.0, 0.0, 0.0, 1.0],
                        diffuse: [0.1, 0.35, 0.1, 1.0],
                        specular: [0.45, 0.55, 0.45, 1.0],
                        shinines: 32.0
                        },
    "Red Plastic":      {
                        ambient: [0.0, 0.0, 0.0, 1.0],
                        diffuse: [0.5, 0.0, 0.0, 1.0],
                        specular: [0.7, 0.6, 0.6, 1.0],
                        shinines: 32.0
                        },
    "White Plastic":    {
                        ambient: [0.0, 0.0, 0.0, 1.0],
                        diffuse: [0.55, 0.55, 0.55, 1.0],
                        specular: [0.70, 0.70, 0.70, 1.0],
                        shinines: 32.0
                        },
    "Yellow Plastic":   {
                        ambient: [0.0, 0.0, 0.0, 1.0],
                        diffuse: [0.5, 0.5, 0.0, 1.0],
                        specular: [0.60, 0.60, 0.50, 1.0],
                        shinines: 32.0
                        },
    "Black Rubber":     {
                        ambient: [0.02, 0.02, 0.02, 1.0],
                        diffuse: [0.01, 0.01, 0.01, 1.0],
                        specular: [0.4, 0.4, 0.4, 1.0],
                        shinines: 10.0
                        },
    "Cyan Rubber":      {
                        ambient: [0.0, 0.05, 0.05, 1.0],
                        diffuse: [0.4, 0.5, 0.5, 1.0],
                        specular: [0.04, 0.7, 0.7, 1.0],
                        shinines: 10.0
                        },
    "Green Rubber":     {
                        ambient: [0.0, 0.05, 0.0, 1.0],
                        diffuse: [0.4, 0.5, 0.4, 1.0],
                        specular: [0.04, 0.7, 0.04, 1.0],
                        shinines:  10.0
                        },
    "Red Rubber":       {
                        ambient: [0.05, 0.0, 0.0, 1.0],
                        diffuse: [0.5, 0.4, 0.4, 1.0],
                        specular: [0.7, 0.04, 0.04, 1.0],
                        shinines: 10.0
                        },
    "White Rubber":     {
                        ambient: [0.05, 0.05, 0.05, 1.0],
                        diffuse: [0.5, 0.5, 0.5, 1.0],
                        specular: [0.7, 0.7, 0.7, 1.0],
                        shinines: 10.0
                        },
    "Yellow Rubber":    {
                        ambient: [0.05, 0.05, 0.0, 1.0],
                        diffuse: [0.5, 0.5, 0.4, 1.0],
                        specular: [0.7, 0.7, 0.04, 1.0],
                        shinines: 10.0
                        }
};

}());

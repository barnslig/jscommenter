/*global alert: false, jQuery: false, document: false */
"use strict";
var Commenter = (function (jQuery) {
	var $ = jQuery.sub();
	$.document = $(document);

	/* Dialog */
	function Dialog(commenter, title, position) {
		var instance = this;
		this.id = Math.random().toString(36).substring(7);
		this.commenter = commenter;

		this.comment = $('<div id="' + this.id + '" class="comments-modal" title="' + title + '"><form onsubmit="return false;"><input placeholder="Name" type="text" class="comment-add-name" /><textarea placeholder="Comment" class="comment-add-comment"></textarea></form><h4>Choose a color:</h4></div>');

		this.addColor('#fbfb8d');
		this.addColor('#b80000');
		this.addColor('#89d289');
		this.addColor('#bcb4f3');
		this.addColor('#e29bfd');
		this.addColor('#ffbb7d');

		commenter.layer.append(this.comment);

		$('#' + this.id + ' .comment-add-colorchooser input[name=comment-add-color]:first').attr('checked', true);

		this.dialog = this.comment.dialog({
			autoOpen:	false,
			close:		function () {
				instance.destroy();
			},
			buttons:	{
				'Save':	function () {
					if (commenter.editEnabled !== 0) {
						commenter.setComment(
							$('#' + this.id + ' .comment-add-name').val(),
							$('#' + this.id + ' .comment-add-comment').val(),
							$('#' + this.id + ' .comment-add-colorchooser input[name=comment-add-color]:checked').val(),
							position,
							commenter.editEnabled
						);
					} else {
						commenter.setComment(
							$('#' + this.id + ' .comment-add-name').val(),
							$('#' + this.id + ' .comment-add-comment').val(),
							$('#' + this.id + ' .comment-add-colorchooser input[name=comment-add-color]:checked').val(),
							position
						);
					}
					instance.destroy();
				},
				'Cancel':	function () {
					instance.destroy();
				}
			}
		});
	}
	(function (fn) {
		fn.open = function () {
			this.dialog.dialog('open');
		};
		fn.close = function () {
			this.dialog.dialog('close');
		};
		fn.destroy = function () {
			this.commenter.editEnabled = false;
			this.commenter.dialogOpen = false;
			this.dialog.remove();
		};
		fn.addColor = function (color) {
			this.comment.append('<label class="comment-add-colorchooser"><input value="' + color + '" type="radio" name="comment-add-color" /><div style="background:' + color + ';"></div></label>');
		};
		fn.setValues = function (values) {
			$('#' + this.id + ' .comment-add-name').val(values.name);
			$('#' + this.id + ' .comment-add-comment').val(values.comment);
			$('#' + this.id + ' .comment-add-colorchooser input[name=comment-add-color][value=' + values.color + ']').attr('checked', true);
		};
	}(Dialog.prototype));

	/* Commenter */
	function Commenter(layer, jsonSource) {
		var instance = this;
		this.layer = $(layer);
		this.jsonSource  = jsonSource;
		this.editEnabled = false;
		this.dialogOpen = false;

		this.container = $('<div class="comments-container">');

		// set the container size
		this.container.css({
			'width': $.document.width(),
			'height': $.document.height()
		});

		this.layer.click(function (e) {
			var posX = e.pageX,
				posY = e.pageY;

			// create the create-dialog
			if (instance.editEnabled === false && instance.dialogOpen === false) {
				this.dialog = new Dialog(instance, 'Create a new comment', [posX, posY]);
				this.dialog.open();
				instance.dialogOpen = true;
			}
		});

		// create the canvases and the comments-layer
		this.staticCanvas = this.createFullScreenCanvas('comments-canvas').
			attr('id', 'comments-static-canvas').
			appendTo(this.container).get(0);
		this.dynamicCanvas = this.createFullScreenCanvas('comments-canvas').
			attr('id', 'comments-dynamic-canvas').
			appendTo(this.container).get(0);
		this.innerLayer = $('<div class="comments-innerLayer">').appendTo(this.container);

		this.staticCTX  = this.staticCanvas.getContext('2d');
		this.dynamicCTX = this.dynamicCanvas.getContext('2d');

		this.dynamicLines = {};

		this.oldJson = [];
		this.loadComments();

		// create the commenter layer and embed it later to prevent browser rendering
		this.layer.append(this.container);

		$('body').append(this.layer);
	}
	(function (fn) {
		fn.hide = function () {
			//this.dialog.close();
			this.container.fadeOut(500);
		};
		fn.show = function () {
			this.container.fadeIn(500);
		};
		fn.toggle = function () {
			this.container.fadeToggle(500);
		};

		/* canvas functions */
		fn.createFullScreenCanvas = function (classNames) {
			return $('<canvas>').attr({
				'class':  classNames,
				'width':  $.document.width(),
				'height': $.document.height()
			});
		};

		fn.redrawLines = function () {
			var context = this.dynamicCTX;

			// clear the canvas
			context.clearRect(0, 0, this.dynamicCanvas.width, this.dynamicCanvas.height);

			// redraw all lines
			context.beginPath();

			$.each(this.dynamicLines, function () {
				// add the line
				context.moveTo(this[0], this[1]);
				context.lineTo(this[2], this[3]);
			});

			context.stroke();
		};

		/* color functions */
		function rgbToHex(rgb) {
			// from http://jqueryui.com/demos/slider/#colorpicker
			var hex = [
				rgb[0].toString(16),
				rgb[1].toString(16),
				rgb[2].toString(16)
			];
			$.each(hex, function (nr, val) {
				if (val.length === 1) {
					hex[nr] = '0' + val;
				}
			});
			return hex.join('').toUpperCase();
		}

		function hexToRgb(hex) {
			var r, g, b;
			// from http://www.javascripter.net/faq/hextorgb.htm
			function cutHex(h) {
				return (h.charAt(0) === "#") ? h.substring(1, 7) : h;
			}

			r = parseInt((cutHex(hex)).substring(0, 2), 16);
			g = parseInt((cutHex(hex)).substring(2, 4), 16);
			b = parseInt((cutHex(hex)).substring(4, 6), 16);

			return [r, g, b];
		}

		function textColorByRgb(rgb) {
			var color;
			if ((rgb[0] + rgb[1] + rgb[2]) < 300) {
				color = "#ffffff";
			} else {
				color = "#000000";
			}
			return color;
		}

		/* the comment load- and add-functions */
		function randomURL(url) {
			// look if there is already a query string
			var anchor = document.createElement('a');
			anchor.href = url;

			if (anchor.search) {
				anchor.search += '&_=' + Math.random().toString(36).substring(7);
			} else {
				anchor.search  = '?_=' + Math.random().toString(36).substring(7);
			}

			return anchor.href;
		}

		fn.loadComments = function () {
			var url = randomURL(this.jsonSource), instance = this;

			// delete all existing comments
			this.dynamicCTX.clearRect(0, 0, this.dynamicCanvas.width, this.dynamicCanvas.height);
			this.staticCTX.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);
			this.innerLayer.find('.comment').remove();

			$.getJSON(url, function (json) {
				if (json) {
					instance.oldJson = json;

					$.each(json, function (v) {
						instance.addComment(
							this.name,
							this.comment,
							this.time,
							this.color,
							this.position
						);
					});
				} else {
					instance.oldJson = [];
				}
			});
		};

		fn.getCommentByTime = function (time) {
			var instance = this, comment, id;

			$.each(instance.oldJson, function (v) {
				if (instance.oldJson[v].time === time) {
					comment = instance.oldJson[v];
					id = v;
				}
			});
			return [id, comment];
		};

		fn.addComment = function (author, content, time, color, position) {
			var instance = this,

				// make the time readable
				date = new Date(time * 1000),
				r_time = date.getHours() + ":" + date.getMinutes() + " " + date.getDate() + "." + date.getMonth() + "." + date.getFullYear(),

				// check for dark colors to set the right font color
				rgb = hexToRgb(color),
				fontColor = textColorByRgb(rgb),

				// create the comment
				comment = $('<div class="comment">').css({
					'left':			parseInt(position[0], 10) + 15,
					'top':			parseInt(position[1], 10) + 15,
					'color':		fontColor,
					'background':	color
				})
					.attr('id', time)
					.append(
						$('<header></header>')
							.append(
								$('<h4></h4>')
									.append(author)
							)
							.append(
								$('<small></small>')
									.append(r_time)
							)
					)
					.append(
						$('<article></article>')
							.append(content)
					)
					.draggable({
						drag:	function () {
							var old = instance.dynamicLines[time],
								pos = $(this).position();

							instance.dynamicLines[time] = [old[0], old[1], pos.left, pos.top];
							instance.redrawLines();
						},
						// just a hack to ensure that the line is always drawed till the edge of the comment
						stop:	function () {
							var old = instance.dynamicLines[time],
								pos = $(this).position();

							instance.dynamicLines[time] = [old[0], old[1], pos.left, pos.top];
							instance.redrawLines();
						}
					})
					.click(function () {
						instance.editEnabled = time;
						var pos = $(this).position();

						// create the edit-dialog
						this.dialog = new Dialog(instance, 'Edit this comment', [pos.left - 15, pos.top - 15]);
						this.dialog.setValues({
							'name':		$(this).find('h4').text(),
							'comment':	$(this).find('article').text(),
							'color':	color
						});
						if (instance.dialogOpen === false) {
							this.dialog.open();
							instance.dialogOpen = true;
						}
					})
					// dirty hack to revert .draggable()s relative position
					.css('position', 'absolute');

			this.innerLayer.append(comment);

			// create the static canvas points
			if (this.staticCanvas.getContext && this.dynamicCanvas.getContext) {
				this.staticCTX.beginPath();
				this.staticCTX.arc(position[0], position[1], 5, 0, Math.PI * 2, true);
				this.staticCTX.fill();

				// redraw the dynamic lines
				this.dynamicLines[time] = [position[0], position[1], (parseInt(position[0], 10) + 15), (parseInt(position[1], 10) + 15)];
				this.redrawLines();
			}
		};

		fn.setComment = function (author, comment, color, position, time) {
			var instance = this,
				everythingWentWell = false,
				lockToken,
				data;

			// lock the file
			data = '<?xml version="1.0" ?><D:lockinfo xmlns:D="DAV:"><D:lockscope><D:shared /></D:lockscope><D:locktype><D:write/></D:locktype></D:lockinfo>';
			$.ajax({
				type:	'LOCK',
				headers:	{'Timeout': 'Second-1000'},
				url:		instance.jsonSource,
				async:		false,
				data:		data,
				dataType:	'xml',
				success:	function (text) {
					lockToken = $(text).find('D\\:href, href').text();
				},
				complete:	function (xhr) {
					if (String(xhr.status).substr(0, 2) === '20') {
						everythingWentWell = true;
					}
				}
			});
			console.log('locked');

			// reload the comments to prevent overwriting
			this.loadComments();

			// generate the new json
			if (this.editEnabled !== 0) {
				var commentObj = this.getCommentByTime(time);
			} else {
				time = Math.round((new Date()).getTime() / 1000);
			}

			var newJson = {
				'name':		author,
				'comment':	comment,
				'position':	position,
				'color':	color,
				'time':		time
			};

			if (this.editEnabled !== 0) {
				this.oldJson.splice(commentObj[0], 1, newJson);
			} else {
				this.oldJson.push(newJson);
			}

			// push it to the server
			$.ajax({
				type:		'PUT',
				headers:	{'If': '(<' + lockToken + '>)'},
				url:		instance.jsonSource,
				async:		false,
				data:		JSON.stringify(instance.oldJson),
				complete:	function (xhr) {
					if (String(xhr.status).substr(0, 2) === '20') {
						everythingWentWell = true;
					} else {
						everythingWentWell = false;
					}
				}
			});
			console.log('putted');

			// unlock the file
			$.ajax({
				type:		'UNLOCK',
				headers:	{'Lock-Token': '<' + lockToken + '>'},
				url:		instance.jsonSource,
				async:		false,
				complete:	function (xhr) {
					// add the comment if everything went well
					if (String(xhr.status).substr(0, 2) === '20') {
						everythingWentWell = true;
					}
					if (everythingWentWell === true) {
						instance.loadComments();

					} else {
						alert('Ooups, something went wrong!');
					}
				}
			});
			console.log('unlocked');
		};

	}(Commenter.prototype));

	return Commenter;
}(jQuery));
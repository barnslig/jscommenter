// Positions are always measured in pixels.
//
// RGB-Colors are always passend in a list. Example: 
//
//      this.textColorByRgb([255, 0 200]);
//
// Please look at [Github](https://github.com/telelo/jscommenter) for additional informations

// ## Main Documentation

/*global alert: false, jQuery: false, document: false, window: false */

// Returns a Commenter()-Object (see below)
var Commenter = (function (jQuery) {
	"use strict";

	var $ = jQuery.sub();
	$.document = $(document);

	// ### WebDAV
	// This is a helper function to provide the commenter easy methodes to lock, unlock and put into files via WebDAV
	function WebDAV(url) {
		this.url = url;
	}
	// The only thing that the methodes are returning is the http status code of the servers response
	(function (fn) {
		// The lock has a 1-Second-Timeout 
		fn.lock = function () {
			var instance = this,
				statusCode,
				data;

			data = '<?xml version="1.0" ?><D:lockinfo xmlns:D="DAV:"><D:lockscope><D:exclusive /></D:lockscope><D:locktype><D:write/></D:locktype></D:lockinfo>';

			$.ajax({
				type:		'LOCK',
				headers:	{'Timeout': 'Second-1000'},
				url:		instance.url,
				data:		data,
				dataType:	'xml',
				success:	function (text) {
					instance.lockToken = $(text).find('D\\:href, href').text();
				},
				complete:	function (xhr) {
					statusCode = String(xhr.status);
				}
			});

			return statusCode;
		};
		fn.put = function (data) {
			var instance = this,
				statusCode;

			$.ajax({
				type:		'PUT',
				headers:	{'If': '(<' + instance.lockToken + '>)'},
				url:		instance.url,
				data:		data,
				complete:	function (xhr) {
					statusCode = String(xhr.status);
				}
			});

			return statusCode;
		};
		fn.unlock = function () {
			var instance = this,
				statusCode;

			$.ajax({
				type:		'UNLOCK',
				headers:	{'Lock-Token': '<' + instance.lockToken + '>'},
				url:		instance.url,
				complete:	function (xhr) {
					statusCode = String(xhr.status);
				}
			});

			return statusCode;
		};
	}(WebDAV.prototype));


	// ### Dialog
	// This is creating a new dialog over all other things
	function Dialog(commenter, title, position) {
		var instance = this,
			state;
		this.id = 'x-' + Math.random().toString(36).substring(7);
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
					if (commenter.editEnabled !== false) {
						state = commenter.setComment(
							$('#' + this.id + ' .comment-add-name').val(),
							$('#' + this.id + ' .comment-add-comment').val(),
							$('#' + this.id + ' .comment-add-colorchooser input[name=comment-add-color]:checked').val(),
							position,
							commenter.editEnabled
						);
					} else {
						state = commenter.setComment(
							$('#' + this.id + ' .comment-add-name').val(),
							$('#' + this.id + ' .comment-add-comment').val(),
							$('#' + this.id + ' .comment-add-colorchooser input[name=comment-add-color]:checked').val(),
							position
						);
					}
					if (state === true) {
						instance.destroy();
					}
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
		// This function is adding a new color to the colorchooser in the dialog
		fn.addColor = function (color) {
			this.comment.append('<label class="comment-add-colorchooser"><input value="' + color + '" type="radio" name="comment-add-color" /><div style="background:' + color + ';"></div></label>');
		};
		// With this function you are able to set the values in the dialog's formula
		// Example:
		//
		//      dialog.setValues({
		//           'name':    'leonard',
		//           'comment': 'testbla',
		//           'color':   '#00ff00'
		//      });
		//
		fn.setValues = function (values) {
			$('#' + this.id + ' .comment-add-name').val(values.name);
			$('#' + this.id + ' .comment-add-comment').val(values.comment);
			$('#' + this.id + ' .comment-add-colorchooser input[name=comment-add-color][value=' + values.color + ']').attr('checked', true);
		};
	}(Dialog.prototype));

	// ### Commenter
	// Here we come to the serious part of the code: The commenter itself. This object gets returned if you create a new Commenter.
	function Commenter(layer, jsonSource) {
		var instance = this;
		this.layer = $(layer);
		this.jsonSource  = jsonSource;
		this.editEnabled = false;
		this.dialogOpen = false;

		this.container = $('<div class="comments-container">');

		// Set the container size
		this.container.css({
			'width': $.document.width(),
			'height': $.document.height()
		});

		this.layer.click(function (e) {
			var posX = e.pageX,
				posY = e.pageY;

			// Create the create-dialog
			if (instance.editEnabled === false && instance.dialogOpen === false) {
				this.dialog = new Dialog(instance, 'Create a new comment', [posX, posY]);
				this.dialog.open();
				instance.dialogOpen = true;
			}
		});

		// Create the canvases and the comments-layer
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

		// Create the commenter layer and embed it later to prevent browser rendering
		this.layer.append(this.container);

		$('body').append(this.layer);
	}
	(function (fn) {
		fn.hide = function () {
			this.container.fadeOut(500);
		};
		fn.show = function () {
			this.container.fadeIn(500);
		};
		fn.toggle = function () {
			this.container.fadeToggle(500);
		};

		// #### Canvas functions
		fn.createFullScreenCanvas = function (classNames) {
			return $('<canvas>').attr({
				'class':  classNames,
				'width':  $.document.width(),
				'height': $.document.height()
			});
		};
		// This function redraws all dynamic lines, it's used by the drag-handlers of each comment.
		fn.redrawLines = function () {
			var context = this.dynamicCTX;

			// Clear the canvas
			context.clearRect(0, 0, this.dynamicCanvas.width, this.dynamicCanvas.height);

			// Redraw all lines
			context.beginPath();

			$.each(this.dynamicLines, function () {
				// Add the line
				context.moveTo(this[0], this[1]);
				context.lineTo(this[2], this[3]);
			});

			context.stroke();
		};

		// #### Color functions
		// [Source](http://jqueryui.com/demos/slider/#colorpicker)
		function rgbToHex(rgb) {
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

		// [Source](http://www.javascripter.net/faq/hextorgb.htm)
		function hexToRgb(hex) {
			var r, g, b;

			function cutHex(h) {
				return (h.charAt(0) === "#") ? h.substring(1, 7) : h;
			}

			r = parseInt((cutHex(hex)).substring(0, 2), 16);
			g = parseInt((cutHex(hex)).substring(2, 4), 16);
			b = parseInt((cutHex(hex)).substring(4, 6), 16);

			return [r, g, b];
		}

		// This function return white or black depending on the input color
		function textColorByRgb(rgb) {
			var color;
			if ((rgb[0] + rgb[1] + rgb[2]) < 300) {
				color = "#ffffff";
			} else {
				color = "#000000";
			}
			return color;
		}

		// #### The comment load- and add-functions

		// Function to create and append a random string to an url to enforce the browser to reload the file
		function randomURL(url) {
			// Look if there is already a query string
			var anchor = document.createElement('a');
			anchor.href = url;

			if (anchor.search) {
				anchor.search += '&_=' + Math.random().toString(36).substring(7);
			} else {
				anchor.search  = '?_=' + Math.random().toString(36).substring(7);
			}

			return anchor.href;
		}

		// Function to clear the canvases and the comments layer and load all comments from the JSON source
		fn.loadComments = function () {
			var url = randomURL(this.jsonSource), instance = this;

			// Delete all existing comments
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

		// Function to get a comment by an UNIX-Timestamp
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

		// This function adds a new comment to the comments layer and creates the origin point and the dynamic line on the canvases
		fn.addComment = function (author, content, time, color, position) {
			var instance = this,

				// Make the time readable
				date = new Date(time * 1000),
				r_time = date.getHours() + ":" + date.getMinutes() + " " + date.getDate() + "." + date.getMonth() + "." + date.getFullYear(),

				// Check for dark colors to set the right font color
				rgb = hexToRgb(color),
				fontColor = textColorByRgb(rgb),

				// Create the comment
				comment = $('<div class="comment">')
					.css({
						'left':			parseInt(position[0], 10) + 15,
						'top':			parseInt(position[1], 10) + 15,
						'color':		fontColor,
						'background':	color
					})
					.attr('id', 'x-' + time)
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
							.css('border-top-color', fontColor)
							.append(content)
					)
					.draggable({
						drag:	function () {
							var old = instance.dynamicLines[time],
								pos = $(this).position();

							instance.dynamicLines[time] = [old[0], old[1], pos.left, pos.top];
							instance.redrawLines();
						},
						// Just a hack to ensure that the line is always drawed till the edge of the comment
						stop:	function () {
							var old = instance.dynamicLines[time],
								pos = $(this).position();

							instance.dynamicLines[time] = [old[0], old[1], pos.left, pos.top];
							instance.redrawLines();
						}
					})
					.click(function () {
						instance.editEnabled = time;
						var pos = instance.getCommentByTime(time);

						// Create the edit-dialog
						this.dialog = new Dialog(instance, 'Edit this comment', [pos[1].position[0], pos[1].position[1]]);
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
					// Dirty hack to revert .draggable()s relative position
					.css('position', 'absolute');

			this.innerLayer.append(comment);

			// Create the static canvas points
			if (this.staticCanvas.getContext && this.dynamicCanvas.getContext) {
				this.staticCTX.beginPath();
				this.staticCTX.arc(position[0], position[1], 5, 0, Math.PI * 2, true);
				this.staticCTX.fill();

				// Redraw the dynamic lines
				this.dynamicLines[time] = [position[0], position[1], (parseInt(position[0], 10) + 15), (parseInt(position[1], 10) + 15)];
				this.redrawLines();
			}
		};

		// Function to create a new comment in the JSON source file
		// Please notice: This function is using the loadComments()-Function so you don't need to call addComment() on creating a new comment
		fn.setComment = function (author, content, color, position, time) {
			var instance = this,
				everythingWentWell = true,
				lockToken,
				data,
				commentObj,
				newJson,
				dav;

			dav = new WebDAV(this.jsonSource);
			alert(dav.lock());
			if (dav.lock().substr(0, 2) === '20') {
				// Reload the comments to prevent overwriting
				this.loadComments();

				// Generate the new JSON
				if (this.editEnabled !== false) {
					commentObj = this.getCommentByTime(time);
				} else {
					time = Math.round((new Date()).getTime() / 1000);
				}

				newJson = {
					'name':		author,
					'comment':	content,
					'position':	position,
					'color':	color,
					'time':		time
				};

				if (this.editEnabled !== false) {
					this.oldJson.splice(commentObj[0], 1, newJson);
				} else {
					this.oldJson.push(newJson);
				}

				if (dav.put(JSON.stringify(instance.oldJson))) {
					if (dav.unlock()) {
						// Reload the comments
						window.setTimeout(function () {
							instance.loadComments();
						}, 200);
					} else {
						everythingWentWell = false;
					}
				} else {
					everythingWentWell = false;
				}
			} else {
				everythingWentWell = false;
			}

			if (everythingWentWell === false) {
				alert('Ooups… Something went wrong! Please try again.');
			}

			return everythingWentWell;
		};

	}(Commenter.prototype));

	return Commenter;
}(jQuery));
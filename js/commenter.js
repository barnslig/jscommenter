var Commenter = function (layer, json_source) {
	var pos_x, pos_y;
	commenter = this;
	commenter.json_source = json_source;
	commenter.editEnabled = false;

	// create the commenter layer
	commenter.layer = $(layer);
	commenter.layer.append('<div id="comments_innerlayer"></div>');

	// create the canvas
	commenter.layer.append('<canvas id="comments_static_canvas" class="comments_canvas" width="' + $(window).width() + '" height="' + $(window).height() + '"></canvas>');
	commenter.layer.append('<canvas id="comments_dynamic_canvas" class="comments_canvas" width="' + $(window).width() + '" height="' + $(window).height() + '"></canvas>');
	commenter.static_canvas = document.getElementById('comments_static_canvas');
	commenter.dynamic_canvas = document.getElementById('comments_dynamic_canvas');
	commenter.static_ctx = commenter.static_canvas.getContext('2d');
	commenter.dynamic_ctx = commenter.dynamic_canvas.getContext('2d');
	commenter.dynamic_lines = {};

	// create the create-dialog
	commenter.dialog = commenter.createDialog();

	// create the onClick-handler
	commenter.layer.click(function (e) {
		pos_x = e.pageX;
		pos_y = e.pageY;

		commenter.dialog.dialog('open');
	});

	commenter.oldJson = [];
	commenter.loadComments();
};

/* hide- and show-functions */
Commenter.prototype.hide = function () {
	commenter.dialog.dialog('close');
	commenter.layer.fadeOut(500);
}
Commenter.prototype.show = function () {
	commenter.layer.fadeIn(500);
}
Commenter.prototype.toggle = function () {
	// the dialog
	if(commenter.layer.is(':visible')) {
		commenter.dialog.dialog('close');
	}
	// the layer
	commenter.layer.fadeToggle(500);
}

/* canvas functions */
Commenter.prototype.redrawLines = function () {
	// clear the canvas
	commenter.dynamic_ctx.clearRect(0, 0, commenter.dynamic_canvas.width, commenter.dynamic_canvas.height);
	// redraw all lines
	commenter.dynamic_ctx.beginPath();

	$.each(commenter.dynamic_lines, function (k, v) {
		dl = String(v).split(',');
		// add the line
		commenter.dynamic_ctx.moveTo(dl[0], dl[1]);
		commenter.dynamic_ctx.lineTo(dl[2], dl[3]);
	});

	commenter.dynamic_ctx.stroke();
}

/* the comment add functions */
Commenter.prototype.loadComments = function () {
	$.getJSON(commenter.json_source + '?' + Math.random().toString(36).substring(7), function (json) {
		if(json != null) {
			commenter.oldJson = json;
			$.each(json, function (v) {
				// add the comment
				commenter.addComment(
					json[v]['name'],
					json[v]['comment'],
					json[v]['time'],
					json[v]['color'],
					json[v]['position']
				);
			});
		} else {
			commenter.oldJson = [];
		}
	});
}
Commenter.prototype.addComment = function (author, content, time, color, position) {
	// create the static canvas points
	if(commenter.static_canvas.getContext) {
		commenter.static_ctx.beginPath();
		commenter.static_ctx.arc(position[0], position[1], 5, 0, Math.PI * 2, true);
		commenter.static_ctx.fill();

		// create the dynamic line
		commenter.dynamic_lines[time] = [position[0], position[1], (parseInt(position[0]) + 15), (parseInt(position[1]) + 15)];
		commenter.redrawLines();
	}

	// make the time readable
	var date = new Date(time * 1000);
	var r_time = date.getHours() + ':' + date.getMinutes() + ' ' + date.getDate() + '.' + date.getMonth() + '.' + date.getFullYear();

	// check for dark colors to set the right font color
	rgb = commenter.hexToRgb(color);
	var fontColor = commenter.textColorByRgb(rgb);

	// create the comment
	$('<div class="comment"></div>')
		.css(
			{
				'left':			(parseInt(position[0]) + 15) + 'px',
				'top':			(parseInt(position[1]) + 15) + 'px',
				'color':		fontColor,
				'background':	color
			}
		)
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
		.appendTo('#comments_innerlayer')
		.click(function () {
			commenter.showEditDialog(time);
			commenter.editEnabled = time;
		});

	// fade it in
	$('#' + time).fadeIn(1000);

	// make it draggable
	$('#' + time).draggable({
		drag: function () {
			old = commenter.dynamic_lines[time];
			pos = $('#' + time).position();
			commenter.dynamic_lines[time] = [old[0], old[1], pos.left, pos.top];

			commenter.redrawLines();
		},
		// ugly fix to draw the line always till the end
		stop: function () {
			old = commenter.dynamic_lines[time];
			pos = $('#' + time).position();
			commenter.dynamic_lines[time] = [old[0], old[1], pos.left, pos.top];

			commenter.redrawLines();
		}
	});
}

/* color functions */
Commenter.prototype.rgbToHex = function (rgb) {
	// stolen from http://jqueryui.com/demos/slider/#colorpicker
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
Commenter.prototype.hexToRgb = function (hex) {
	// from http://www.javascripter.net/faq/hextorgb.htm
	function cutHex(h) {
		return (h.charAt(0)=='#') ? h.substring(1,7):h
	}
	
	r = parseInt((cutHex(hex)).substring(0,2),16);
	g = parseInt((cutHex(hex)).substring(2,4),16);
	b = parseInt((cutHex(hex)).substring(4,6),16);

	return [r, g, b];
}
Commenter.prototype.textColorByRgb = function (rgb) {
	if((rgb[0] + rgb[1] + rgb[2]) < 300) {
		return '#ffffff';
	} else {
		return '#000000';
	}
}

/* the comment generator dialog */
Commenter.prototype.getCommentByTime = function (time) {
	// get the comment
	var comment, id;
	$.each(commenter.oldJson, function (v) {
		if(commenter.oldJson[v]['time'] == time) {
			comment = commenter.oldJson[v];
			id = v;
		}
	});
	return [id, comment];
}
Commenter.prototype.showEditDialog = function (id) {
	comment = commenter.getCommentByTime(id);

	if(comment != null) {
		// insert things into the dialog
		$('#comment_add_name').val(comment[1]['name']);
		$('#comment_add_comment').val(comment[1]['comment']);
	}
}
Commenter.prototype.createDialog = function () {
	commenter.layer.append('<div id="comments_modal" title="Create a new comment"><form><input placeholder="Name" type="text" id="comment_add_name" /><textarea placeholder="Comment" id="comment_add_comment"></textarea></form><h4>Choose a color:</h4><div id="comments_add_color_chooser"><div id="comment_add_color_red"></div><div id="comment_add_color_green"></div><div id="comment_add_color_blue"></div></div><div id="comment_add_color_field"></div></div>');

	// create the dialog
	var dialog = $('#comments_modal').dialog({
		autoOpen:	false,
		buttons: {
			'Create the comment': function () {
				// get the color
				var r = $('#comment_add_color_red').slider('value');
				var g = $('#comment_add_color_green').slider('value');
				var b = $('#comment_add_color_blue').slider('value');

				// check if editing is enabled
				if(commenter.editEnabled != 0) {
					comment = commenter.getCommentByTime(commenter.editEnabled);

					// update the comment
					commenter.userSetComment(
						$('#comment_add_name').val(),
						$('#comment_add_comment').val(),
						'#' + commenter.rgbToHex([r, g, b]),
						comment[1]['position'],
						comment[1]['time']
					);
				} else {
					// create the comment
					commenter.userSetComment(
						$('#comment_add_name').val(),
						$('#comment_add_comment').val(),
						'#' + commenter.rgbToHex([r, g, b]),
						[pos_x, pos_y]
					);
				}

				$(this).dialog('close');
				$('#comment_add_name').val('');
				$('#comment_add_comment').val('');
				commenter.editEnabled = false;
			},
			'Cancel': function () {
				$(this).dialog('close');
				commenter.editEnabled = false;
			}
		}
	});

	// create the colorchooser
	$('#comment_add_color_field').css('background', '#' + commenter.rgbToHex([125, 125, 125]));
	$('#comment_add_color_red, #comment_add_color_green, #comment_add_color_blue').slider({
		orientation: 'vertical',
		max:	255,
		value:	125,
		range:	'min',
		slide:	function () {
			var r = $('#comment_add_color_red').slider('value');
			var g = $('#comment_add_color_green').slider('value');
			var b = $('#comment_add_color_blue').slider('value');

			// check for dark colors to set the right font color
			var fontColor = commenter.textColorByRgb([r, g, b]);
			$('#comment_add_color_field').css('color', fontColor);

			// set the color-show-div-background
			$('#comment_add_color_field').css('background', '#' + commenter.rgbToHex([r, g, b]));
		}
	});

	return dialog;
}

Commenter.prototype.userSetComment = function (author, comment, color, position, time){
	// lock the file
	var lockToken;
	data = '<?xml version="1.0" ?><D:lockinfo xmlns:D="DAV:"><D:lockscope><D:shared /></D:lockscope><D:locktype><D:write/></D:locktype></D:lockinfo>';
	$.ajax({
		type:		'LOCK',
		headers:	{'Timeout': 'Second-1000'},
		url:		commenter.json_source,
		async:		false,
		data:		data,
		dataType:	'xml',
		success:	function (text) {
			// get the lock token
			//// firefox hack: D\\:href
			lockToken = $(text).find('D\\:href, href').text();
			
		}/*,
		complete:	function (xhr, text) {
			// check for a lock
			if(xhr.status != 423) {
				// deal with the existing lock. remember: it's only a second long
			}
		}*/
	});
	console.log('locked');

	// reload the comments to prevent overwriting
	$('#comments_innerlayer').empty();
	commenter.loadComments();

	// generate the new json
	if(commenter.editEnabled != 0) {
		var commentObj = commenter.getCommentByTime(time);
	} else {
		var time = Math.round((new Date()).getTime() / 1000);
	}
	
	var newJson = {
		'name':		author,
		'comment':	comment,
		'position':	position,
		'color':	color,
		'time':		time
	};

	if(commenter.editEnabled != 0) {
		commenter.oldJson.splice(commentObj[0], 1, newJson);
	} else {
		commenter.oldJson.push(newJson);
	}

	// push it to the server
	var everythingWentWell = false;
	$.ajax({
		type:		'PUT',
		headers:	{'If': '(<' + lockToken + '>)'},
		url:		commenter.json_source,
		async:		false,
		data:		JSON.stringify(commenter.oldJson),
		complete:	function (xhr) {
			if(String(xhr.status).substr(0, 2) == '20') {
				everythingWentWell = true;
			}
		}
	});
	console.log('putted');

	// unlock the file
	$.ajax({
		type:		'UNLOCK',
		headers:	{'Lock-Token': '<' + lockToken + '>'},
		url:		commenter.json_source,
		async:		false,
		complete:	function (xhr) {
			// add the comment if everything went well
			if(String(xhr.status).substr(0, 2) == '20') {
				everythingWentWell = true;
			}
			if(everythingWentWell == true) {
				$('.comment').remove();
				//setTimeout('commenter.loadComments()', 1500);
			} else {
				alert('Ooups, something went wrong!');
			}
		}
	});
	
	console.log('unlocked');
}
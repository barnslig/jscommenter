function Commenter(json_source) {
	var pos_x, pos_y;

	// create a new layer
	var frame = $('body').append('<div id="comments_layer"></div>');
	$('#comments_layer').append('<div id="comments_innerlayer"></div>');
	$('#comments_layer').append('<canvas id="comments_static_canvas" class="comments_canvas" width="' + $(window).width() + '" height="' + $(window).height() + '"></canvas>');
	$('#comments_layer').append('<canvas id="comments_dynamic_canvas" class="comments_canvas" width="' + $(window).width() + '" height="' + $(window).height() + '"></canvas>');

	// create the modal
	$('#comments_layer').append('<div id="comments_modal" title="Create a new comment"><form><input placeholder="Name" type="text" id="comment_add_name" /><textarea placeholder="Comment" id="comment_add_comment"></textarea></form><h4>Choose a color:</h4><div id="comments_add_color_chooser"><div id="comment_add_color_red"></div><div id="comment_add_color_green"></div><div id="comment_add_color_blue"></div></div><div id="comment_add_color_field">foobar</div></div>');
	
	//// the color chooser
	$('#comment_add_color_field').css('background', '#' + rgbToHex([125, 125, 125]));
	$('#comment_add_color_red, #comment_add_color_green, #comment_add_color_blue').slider({
		orientation: 'vertical',
		max:	255,
		value:	125,
		range:	'min',
		slide:	function() {
			var r = $('#comment_add_color_red').slider('value');
			var g = $('#comment_add_color_green').slider('value');
			var b = $('#comment_add_color_blue').slider('value');

			// check for dark colors to set the right font color
			var fontColor = textColorByRgb([r, g, b]);
			$('#comment_add_color_field').css('color', fontColor);

			// set the color-show-div-background
			$('#comment_add_color_field').css('background', '#' + rgbToHex([r, g, b]));
		}
	});

	//// the modal itself
	$('#comments_modal').dialog({
		autoOpen:	false,
		buttons: {
			'Create the comment': function() {
				// get the color
				var r = $('#comment_add_color_red').slider('value');
				var g = $('#comment_add_color_green').slider('value');
				var b = $('#comment_add_color_blue').slider('value');

				// create the comment
				userAddComment(
					$('#comment_add_name').val(),
					$('#comment_add_comment').val(),
					'#' + rgbToHex([r, g, b]),
					[pos_x, pos_y]
				);

				$(this).dialog('close');
			},
			'Cancel': function() {
				$(this).dialog('close');
			}
		}
	});

	// create something that resizes the canvas on window resize
	/*
	$(window).resize(function(){
		$('#comments_canvas').attr('width', $(window).width()).attr('height', $(window).height());
	});
	*/ // just bad, the canvas get cleared on resize

	// create the comment generator
	$('#comments_innerlayer').click(function(e) {
		pos_x = e.pageX;
		pos_y = e.pageY;
			//userAddComment([e.pageX, e.pageY]);
		$('#comments_modal').dialog('open');
	});

	// create the canvas handlers
	var static_canvas = document.getElementById('comments_static_canvas');
	var static_ctx = static_canvas.getContext('2d');
	var dynamic_canvas = document.getElementById('comments_dynamic_canvas');
	var dynamic_ctx = dynamic_canvas.getContext('2d');
	dynamic_lines = {};

	// load the comments
	var oldJson;
	loadComments();

	// create ALL the methodes!
	this.hide = hide;
	this.show = show;
	this.toggle = toggle;
	this.addComment = addComment;
	this.addCloseLink = addCloseLink;
	this.userAddComment = userAddComment;
	this.loadComments = loadComments;
	this.redrawLines = redrawLines;
	this.rgbToHex = rgbToHex;
	this.hexToRgb = hexToRgb;
	this.textColorByRgb = textColorByRgb;

	function hide() {
		$('#comments_layer').fadeOut(500);
	}
	function show() {
		$('#comments_layer').fadeIn(500);
	}
	function toggle() {
		$('#comments_layer').fadeToggle(500);
	}
	function textColorByRgb(rgb) {
		if((rgb[0] + rgb[1] + rgb[2]) < 300) {
			return "#ffffff";
		} else {
			return "#000000";
		}
	}
	function rgbToHex(rgb) {
		// stolen from http://jqueryui.com/demos/slider/#colorpicker
		var hex = [
			rgb[0].toString(16),
			rgb[1].toString(16),
			rgb[2].toString(16)
		];
		$.each(hex, function(nr, val) {
			if (val.length === 1) {
				hex[nr] = '0' + val;
			}
		});
		return hex.join('').toUpperCase();
	}
	function hexToRgb(hex) {
		// from http://www.javascripter.net/faq/hextorgb.htm
		function cutHex(h) {
			return (h.charAt(0)=="#") ? h.substring(1,7):h
		}
		
		r = parseInt((cutHex(hex)).substring(0,2),16);
		g = parseInt((cutHex(hex)).substring(2,4),16);
		b = parseInt((cutHex(hex)).substring(4,6),16);

		return [r, g, b];
	}
	function redrawLines() {
		// clear the canvas
		dynamic_ctx.clearRect(0, 0, dynamic_canvas.width, dynamic_canvas.height);
		// redraw all lines
		dynamic_ctx.beginPath();
		$.each(dynamic_lines, function(v) {
			// add the line
			
			dynamic_ctx.moveTo(dynamic_lines[v][0], dynamic_lines[v][1]);
			dynamic_ctx.lineTo(dynamic_lines[v][2], dynamic_lines[v][3]);
		});
		dynamic_ctx.stroke();
	}
	function loadComments() {
		$.getJSON(json_source, function(json) {
			if(json != null) {
				oldJson = json;
				$.each(json, function(v) {
					// add the comment
					addComment(
						json[v]['name'],
						json[v]['comment'],
						json[v]['time'],
						json[v]['color'],
						json[v]['position']
					);
				});
			} else {
				oldJson = [];
			}
		});
	}
	function addComment(author, content, time, color, position) {
		// create the static canvas points
		if(static_canvas.getContext) {
			static_ctx.beginPath();
			static_ctx.arc(position[0], position[1], 5, 0, Math.PI * 2, true);
			static_ctx.fill();
		}
		// create the dynamic line
		dynamic_lines[time] = [position[0], position[1], (parseInt(position[0]) + 15), (parseInt(position[1]) + 15)];
		redrawLines();

		// make the time readable
		var date = new Date(time * 1000);
		var r_time = date.getHours() + ":" + date.getMinutes() + " " + date.getDate() + "." + date.getMonth() + "." + date.getFullYear();

		// check for dark colors to set the right font color
		rgb = hexToRgb(color);
		var fontColor = textColorByRgb(rgb);

		// create the comment
		$('#comments_innerlayer').append('<div style="left:' + (parseInt(position[0]) + 15) + 'px;top:' + (parseInt(position[1]) + 15) + 'px;color:' + fontColor + ';background:' + color + ';" class="comment" id="' + time + '">' + author + '<br>' + content + '<br>' + r_time + '</div>')
		
		// fade it in
		$('#' + time).fadeIn(1000);

		// make it draggable
		$('#' + time).draggable({
			drag: function() {
				old = dynamic_lines[time];
				pos = $('#' + time).position();
				dynamic_lines[time] = [old[0], old[1], pos.left, pos.top];

				redrawLines();
			},
			// ugly fix to draw the line always till the end
			stop: function() {
				old = dynamic_lines[time];
				pos = $('#' + time).position();
				dynamic_lines[time] = [old[0], old[1], pos.left, pos.top];

				redrawLines();
			}
		});
}
	function addCloseLink(elem) {
		$('#comments_layer').append('<a id="comment_close" href="javascript:' + elem + '.hide();">X</a>')
	}
	function userAddComment(user, comment, color, position) {
		// reload the comments to prevent overwriting
		loadComments();

		// generate the new json
		var time = Math.round((new Date()).getTime() / 1000);
		var newJson = {
			'name':		user,
			'comment':	comment,
			'position':	position,
			'color':	color,
			'time':		time
		};
		oldJson.push(newJson);

		// lock the file
		var lockToken;
		data = '<?xml version="1.0" ?><D:lockinfo xmlns:D="DAV:"><D:lockscope><D:shared /></D:lockscope><D:locktype><D:write/></D:locktype></D:lockinfo>';
		$.ajax({
			type:		'LOCK',
			headers:	{'Timeout': 'Second-1000'},
			url:		json_source,
			async:		false,
			data:		data,
			dataType:	'xml',
			success:	function(text) {
				// get the lock token
				lockToken = $(text).find('href').text();
			}/*,
			complete:	function(xhr, text) {
				// check for a lock
				if(xhr.status != 423) {
					// deal with the existing lock. remember: it's only a second long
				}
			}*/
		});
		console.log('locked');

		// get the latest version
		loadComments();

		// push it to the server
		$.ajax({
			type:		'PUT',
			headers:	{'If': '(<' + lockToken + '>)'},
			url:		json_source,
			async:		false,
			data:		JSON.stringify(oldJson)
		});
		console.log('putted');

		// unlock the file
		$.ajax({
			type:		'UNLOCK',
			headers:	{'Lock-Token': '<' + lockToken + '>'},
			url:		json_source,
			async:		false,
			complete:	function (xhr) {
				// add the comment if everything went well
				if(String(xhr.status).substr(0, 2) == "20") {
					addComment(user, comment, time, color, position);
				} else {
					alert("Ooups, something went wrong!");
				}
			}
		});
		console.log('unlocked');
	}
}
function Commenter(json_source) {
	// create a new layer
	var frame = $('body').append('<div id="comments_layer"></div>');
	$('#comments_layer').append('<canvas id="comments_static_canvas" class="comments_canvas" width="' + $(window).width() + '" height="' + $(window).height() + '"></canvas>');
	$('#comments_layer').append('<canvas id="comments_dynamic_canvas" class="comments_canvas" width="' + $(window).width() + '" height="' + $(window).height() + '"></canvas>');
	$('#comments_layer').append('<div id="comments_innerlayer"></div>');

	// create something that resizes the canvas on window resize
	/*
	$(window).resize(function(){
		$('#comments_canvas').attr('width', $(window).width()).attr('height', $(window).height());
	});
	*/ // just bad, the canvas get cleared on resize

	// create the comment generator
	$('#comments_innerlayer').click(function(e) {
			userAddComment([e.pageX, e.pageY]);
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
	this.addComment = addComment;
	this.addCloseLink = addCloseLink;
	this.userAddComment = userAddComment;
	this.redrawLines = redrawLines;

	function hide() {
		$("#comments_layer").fadeOut(500);
	}
	function show() {
		$("#comments_layer").fadeIn(500);
	}
	function redrawLines() {
		// clear the canvas
		dynamic_ctx.clearRect(0, 0, dynamic_canvas.width, dynamic_canvas.height);
		// redraw all lines
		$.each(dynamic_lines, function(v) {
			// add the line
			dynamic_ctx.beginPath();
			dynamic_ctx.moveTo(dynamic_lines[v][0], dynamic_lines[v][1]);
			dynamic_ctx.lineTo(dynamic_lines[v][2], dynamic_lines[v][3]);
			dynamic_ctx.stroke();
		});
	}
	function loadComments() {
		$.getJSON(json_source, function(json) {
			oldJson = json;
			$.each(json, function(v) {
				// add the comment
				addComment(
					json[v]['name'],
					json[v]['comment'],
					json[v]['time'],
					json[v]['position']
				);
			});
		});
		console.log("loaded");
	}
	function addComment(author, content, time, position) {
		// create the static canvas points
		if(static_canvas.getContext) {
			static_ctx.beginPath();
			static_ctx.arc(position[0], position[1], 5, 0, Math.PI * 2, true);
			static_ctx.fill();
		}
		// create the dynamic line
		dynamic_lines[time] = [position[0], position[1], (parseInt(position[0]) + 15), (parseInt(position[1]) + 15)];
		redrawLines();
		// create the comment
		$("#comments_innerlayer").append('<div style="left:' + (parseInt(position[0]) + 15) + 'px;top:' + (parseInt(position[1]) + 15) + 'px;" class="comment" id="' + time + '">' + author + '<br>' + content + '<br>' + time + '</div>')
		
		// fade it in
		$('#' + time).fadeIn(1000);

		// make it draggable
		$('#' + time).draggable({
			drag: function() {
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
	function userAddComment(position) {
		var user = prompt("Your Name:");
		if(user != null) {
			var comment = prompt("Your Comment:");
			if(comment != null) {
				// generate the new json
				var time = Math.round((new Date()).getTime() / 1000);
				var newJson = {
					"name": user,
					"comment": comment,
					"position": position,
					"time": time
				};
				oldJson.push(newJson);

				// lock the file
				var lockToken;
				data = '<?xml version="1.0" ?><D:lockinfo xmlns:D="DAV:"><D:lockscope><D:shared /></D:lockscope><D:locktype><D:write/></D:locktype></D:lockinfo>';
				$.ajax({
					type:		"LOCK",
					headers:	{'Timeout': 'Second-1000'},
					url:		json_source,
					async:		false,
					data:		data,
					dataType:	"xml",
					success:	function(text) {
						// get the lock token
						lockToken = $(text).find("href").text();
					}/*,
					complete:	function(xhr, text) {
						// check for a lock
						if(xhr.status != 423) {
							// deal with the existing lock. remember: it's only a second long
						}
					}*/
				});
				console.log("locked");

				// get the latest version
				loadComments();

				// push it to the server
				$.ajax({
					type:		"PUT",
					headers:	{
									'Lock-Token': "<" + lockToken + ">",
									"If": '(<' + lockToken + '>)'
								},
					url:		json_source,
					async:		false,
					data:		JSON.stringify(oldJson)
				});
				console.log("putted");

				// unlock the file
				$.ajax({
					type:		"UNLOCK",
					headers:	{'Lock-Token': "<" + lockToken + ">"},
					url:		json_source,
					async:		false
				});
				console.log("unlocked.");

				// add the comment
				addComment(user, comment, time, position);
			}
		}
	}
}
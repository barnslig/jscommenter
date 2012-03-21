function Commenter(json_source) {
	// create a new layer
	var frame = $('body').append('<div id="comments_layer"></div>');
	$('#comments_layer').append('<canvas id="comments_canvas"></canvas>');
	$('#comments_layer').append('<div id="comments_innerlayer"></div>');

	// create the comment generator
	$('#comments_innerlayer').click(function(e) {
			userAddComment(e.pageX, e.pageY);
	});

	// create the canvas handler
	var canvas = $('#comments_canvas');

	// load the comments
	var oldJson;
	loadComments();

	// create ALL the methodes!
	this.hide = hide;
	this.show = show;
	this.addComment = addComment;
	this.addCloseLink = addCloseLink;
	this.userAddComment = userAddComment;

	function hide() {
		$("#comments_layer").fadeOut(500);
	}
	function show() {
		$("#comments_layer").fadeIn(500);
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
				$('#' + json[v]['time']).fadeIn(1000);

				// create the canvas
				if(canvas.getContext) {
					canvas.arc()
				}

				// make it draggable
				$('#' + json[v]['time']).draggable();
			});
		});
	}
	function addComment(author, content, time, position) {
		$("#comments_innerlayer").append('<div style="left:' + position[0] + 'px;top:' + position[1] + 'px;" class="comment" id="' + time + '">' + author + '<br>' + content + '<br>' + time + '</div>')
	}
	function addCloseLink(elem) {
		$('#comments_layer').append('<a id="comment_close" href="javascript:' + elem + '.hide();">X</a>')
	}
	function userAddComment(pos_x, pos_y) {
		var user = prompt("Your Name:");
		if(user != null) {
			var comment = prompt("Your Comment:");
			if(comment != null) {
				// generate the new json
				var time = Math.round((new Date()).getTime() / 1000);
				var newJson = {
					"name": user,
					"comment": comment,
					"position": [pos_x, pos_y],
					"time": time
				};
				oldJson.push(newJson);

				// add the comment
				//addComment(user, comment, time, [pos_x, pos_y]);
				// make it draggable
				//$('#' + time).draggable();

				// lock the file
				//var lockInterval = window.setInterval(lockFile, 1500);
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
					},
					complete:	function(xhr, text) {
						// check for a lock
						if(xhr.status != 423) {
							//window.clearInterval(lockInterval);
						}
					}
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

				// reload the comments
				loadComments();
			}
		}
	}
}
$(document).ready(function() {
	describe("Commenter", function() {
		var commenter = new Commenter('#krebs', '../foo.comments.json');
		commenter.hide();
		var testComment;

		it('should be able to show', function() {
			commenter.show();
			waits(600);
			expect(commenter.container.css('display')).toMatch('block');
		});
		/*
		it('should be able to hide', function() {
			commenter.hide();
			waits(600);
			expect(commenter.container.css('display')).not.toMatch('block');
		});
		*/

		it('should be able to create a fullscreen canvas', function() {
			expect(commenter.createFullScreenCanvas('test')).toBe('canvas.test');
		});

		it('should be able to create a comment', function() {
			// test creating a new comment
			var newComment = commenter.setComment('leonard', 'testbla!', '#00ff00', [100, 100]);
			expect(newComment).toBeTruthy();
			testComment = commenter.oldJson[commenter.oldJson.length - 1];
			expect(testComment.comment).toMatch('testbla!');

			// test editing a comment
			var editComment = commenter.setComment('leonard', 'testbla?', '#00ff00', [100, 100], testComment.time);
			testComment = commenter.oldJson[commenter.oldJson.length - 1];
			expect(testComment.comment).toMatch('testbla?');
		});

		it('should be able to load comments', function() {
			//commenter.oldJson = null;
			commenter.innerLayer.append('<div class="comment" id="testbla"></div>');

			commenter.loadComments();

			waits(600);

			// check if deleting works well
			expect(commenter.innerLayer.find('#testbla').length).toBe(0);
			// check if loading new comments works well
			expect(commenter.innerLayer.find('.comment').length).not.toBe([]);
			// check if setting the json variable works well
			expect(commenter.oldJson).not.toBeNull();										// depends on the previous test
		});

		it('should be able to add a comment', function() {
			commenter.addComment('leonard', 'testbla?', 123456, '#00ff00', [100, 100]);

			waits(600);

			expect(commenter.innerLayer.find('div#x-123456').length).not.toBe(0);			// test if the comment is created
			expect(commenter.innerLayer.find('div#x-123456')).toHandle('click');			// test if the click handler is generated
			expect(commenter.innerLayer.find('div#x-123456')).toHaveClass('ui-draggable');	// test if the draggable is generated
		});

		it('should be able to get a comment by a timestamp', function() {					// depends on the create-a-comment-test
			var comment = commenter.getCommentByTime(testComment.time);
			expect(comment[1].comment).toMatch(testComment.comment);
		});
	});
});
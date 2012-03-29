$(document).ready(function() {
	describe("Commenter", function() {
		beforeEach(function() {	
			this.commenter = new Commenter('#krebs', '../foo.comments.json');
			this.commenter.hide();
		});

		it('should be able to create a fullscreen canvas', function() {
			expect(this.commenter.createFullScreenCanvas('test')).toBe('canvas.test');
		});

		it('should be able to create a comment', function() {
			var lockCalled = false,
				putCalled = false,
				unlockCalled = false;
			(function(fn) {
				fn.lock = function() {
					lockCalled = true;
					return "204";
				};
				fn.put = function(data) {
					putCalled = true;
					return "204";
				};
				fn.unlock = function() {
					unlockCalled = true;
					return "204";
				};
			}(this.commenter.WebDAV.prototype));
			spyOn(this.commenter, 'loadComments');
			this.commenter.oldJson = [];

			// test creating a new comment
			var newComment = this.commenter.setComment('leonard', 'testbla!', '#00ff00', [100, 100]);
			expect(newComment).toBeTruthy();
			expect(this.commenter.loadComments).toHaveBeenCalled();
			expect(lockCalled).toBeTruthy();
			expect(putCalled).toBeTruthy();
			expect(unlockCalled).toBeTruthy();
			expect(this.commenter.oldJson.length).toBe(1);
		});

		it('should be able to edit a comment', function() {
			var lockCalled = false,
				putCalled = false,
				unlockCalled = false;
			(function(fn) {
				fn.lock = function() {
					lockCalled = true;
					return "204";
				};
				fn.put = function(data) {
					putCalled = true;
					return "204";
				};
				fn.unlock = function() {
					unlockCalled = true;
					return "204";
				};
			}(this.commenter.WebDAV.prototype));
			spyOn(this.commenter, 'loadComments');
			this.commenter.editEnabled = [
				{
					"name": "leonard",
					"comment": "testbla!",
					"position": [100, 100],
					"color": "#00ff00",
					"time": 1333023608
				}
			];
			this.commenter.editEnabled = 1333023608;

			var editComment = this.commenter.setComment('leonard', 'testbla?', '#00ff00', [100, 100]);
			expect(editComment).toBeTruthy();
			expect(this.commenter.loadComments).toHaveBeenCalled();
			expect(lockCalled).toBeTruthy();
			expect(putCalled).toBeTruthy();
			expect(unlockCalled).toBeTruthy();
			expect(this.commenter.oldJson.length).toBe(1);
			expect(this.commenter.oldJson[0].comment).toBe("testbla?");
			expect(this.editEnabled).toBeFalsy();
		});

		it('should be able to load comments', function() {
			spyOn(this.commenter, 'randomURL');
			spyOn(this.commenter.dynamicCTX, 'clearRect');
			spyOn(this.commenter.staticCTX, 'clearRect');
			spyOn(this.commenter.$, 'ajax').andCallFake(function(params) {
				params.success(
					[
						{
							"name": "leonard",
							"comment": "testbla!",
							"position": [100, 100],
							"color": "#00ff00",
							"time": 1333023608
						}
					]
				);
			});
			spyOn(this.commenter, 'addComment');

			this.commenter.loadComments();

			expect(this.commenter.staticCTX.clearRect).toHaveBeenCalled();
			expect(this.commenter.dynamicCTX.clearRect).toHaveBeenCalled();
			expect(this.commenter.$.ajax).toHaveBeenCalled();
			expect(this.commenter.addComment).toHaveBeenCalled();
		});

		it('should be able to add a comment', function() {
			this.commenter.dynamicLines = {}
			spyOn(this.commenter.staticCTX, 'arc');
			spyOn(this.commenter.innerLayer, 'append');
			spyOn(this.commenter, 'redrawLines');

			this.commenter.addComment('leonard', 'testbla?', 1333023608, '#00ff00', [100, 100])

			expect(this.commenter.innerLayer.append).toHaveBeenCalled();
			expect(this.commenter.staticCTX.arc).toHaveBeenCalled();
			expect(this.commenter.redrawLines).toHaveBeenCalled();
			expect(this.commenter.dynamicLines[1333023608]).not.toBeNull();
		});

		it('should be able to get a comment by a timestamp', function() {
			this.commenter.oldJson = [
					{
						"name": "leonard",
						"comment": "testbla!",
						"position": [100, 100],
						"color": "#00ff00",
						"time": 1333023608
					}
				];

			var comment = this.commenter.getCommentByTime(1333023608);

			expect(comment[1].comment).toMatch("testbla!");
		});
	});
});
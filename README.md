#BRICOLAGE

[ ] Make 'what do you love' on the search page center a lil better

#[ ] DEPLOY TO HEROKU TONIGHT

[ ] If you delete an image on someone else's page then toast "Gone but not forgotten."
[ ] Nice random affirmations.
[ ] Random affirmation website. Moderated / if you post a certain # of good things you can approve.

[ ] Code cleanup
[ ] Change Twitter Oauth callback URL
[ ] Hide Client secrets in process.env before uploading to github

[ ] Grab random categories + thumbs & display on main page
[ ] Make vertical images display properly
[ ] Pagination on search pages, better categories
[ ] Hover box on bottom right or left when you reach that part of the screen scrolling there

##main/landing page
[ ] Front page/splash page: rotary phone, small glpyhs "pick a thing you like" or "type a word you like"
[ ] Maybe nicer vector icons for the CLOSE thing
[ ] Could even imitate a window-bar of a computer page with filename/title/username/link, make clickable!

[ ] Random unsplash photo on main page
[ ] Pulsing HSL thing behind cutesy icons
[ ] Or click what you love

[ ] Landing page
[ ] Search page / tag page / category page -> EXPLORE

[ ] Make expanded CLOSE box prettier
[ ] MAYBE do tooltip/hover image info for the fullscreen image. probs not.

##^^implement now before push##

##tidy up login and register pages
[X] Implement "toasts"
 -> PROGRAM A TOASTER XD

 Things to toast:
 'SUCCESSFULLY ADDED IMAGE'
 'SUCCESSFUL LOGIN'
 'IMAGE DELETED' (W/"Oops-undo" w/quick masonry restore)

####BIG IDEAS FOR LATER
[ ] If you see an imagewall that you lke you can like, "FORK" it or copy it over to your own
 -> Ability to have multiple image-walls per user
 -> User "image-wall" management panel
 -> Ability to edit and save off images with your canvas interface
 -> User sharing image wall on social media etc
 -> Cool randomized/generative art things too.
 -> Maybe add a separate button for closing vs deleting
 -> Or have a "management" page with delete button instead of close button.
[ ] Hover-tooltips for the display: make them show up the first time and then go away later, e.g., "GOT IT!"

[ ] Find a way to figure out if it's a "new" user and/or they haven't been here in a while: Intelligentsia tooltips

-> creative ways of exploring images:
	=> collage with overlays
	=> carousel display
	=> slideshow
	=> image pile with 2d/3d skew?
	=> weird vertical bars?

[ ] Add options for end user to apply tags to photos and then view collections by tag
[ ] Add options for user to rearrange photos in the collection -> would require a numeric overlay with Masonry and some array rearrangement trickery
-> all that a tagged collection is is just a list of IDs that happen to be associated with a "tag"
so it's an Object
userTags={ 'tag': [ARRAY,OF,IDs,WITH,THAT,TAG], 'anotherTag': [ANOTHER,ARRAY] };

-> Save the query results as an array of Image IDs. + metadata like name of query and num results and query date.
	-> Save every image from query into Images, which is easy because it's just an array of image objects
-> When you make a QUERY, you recall the array of Image IDs, look them up in the Images collection and then deliver them to the cLIENT.

So the question is:
We already have this image data on the server in JSON. What's most efficient?

Send JSON data back from client selectively based on user choosing an image?
 -> makes some sense. user's not going to add all images, only a small subset.
 -> we don't have to store as much on the db
 -> slight increase in # of queries.

[ ] Put in "rate-limiting" protection so if you get an HTTP code of too many you pause for a while
[X] Add a non-OAuth option (e.g., general login or test user) for ppl who don't want to use twitter
[X] Cache search results or pages (can display the search only at certain times or whatever) to display hotlinked images directly
[X] Handle the case of no search results
[X] Type what you like
[X] Type what you like
[X] mix-blend-mode on the div#imageModal for neat effects
-> could do a cool collaeg-y thing for the main page
-> dynamic collage with a few images overlaid / snipped / whatever
-> maybe html5 canvas or maybe serverside collage, NPM collage module
[X] Simple top-nav bar with (when logged in) -> MY WAVE / OTHER WAVES
[X] ALL USERS' WAVES: /waves/all -> routes to a page w/ user links and user waves
[X] MY WAVES -> routes to /me or /u/<MY USER NAME> and shows my waves
	-> when on my own page, I have the option to delete from my waves
	-> when searching on the thin
[X] Can make the entire infobox smaller: just bottom or top and maybe 10% or so, plus add transparency to make it smoother
[X] Make your own SVG glyphs so there's no jumping/jerking when you mouseover the close/minimize/maximize icons
[X] Make the ADD button work (e.target.id)
[X] For maximization: don't use the same infobox div as you use previously, and don't resize the element _IN_ the grid. Instead, use DICT to look up the next larger size of the image, LOAD the image, wait for the image to be loaded, and then pop a div (or a placeholder value, even just "CAN'T LOAD THAT IMAGE, HMM..." text if it's broken).
[X] Can resize sizer.style.width and sizer.style.height to fit screen or width of div container
[X] Close one image and then quickly mouseover another. The infobox is slightly off.
[X] User Story: As an unauthenticated user, I can login with Twitter.
[X] User Story: As an unauthenticated user, I can browse other users' walls of images.

[X] I get "failed to find request token in session" when NOT already logged in on Twitter, log out, click auth, log in.
-> if I'm already logged in on Twitter though, it works fine.
[X] -> this happens when you're logged in as localhost and not as http://127.0.0.1:3000
[X] If you expand the window particularly wide, the hover div is too large
^GOAL #1
	[X] Our minimize and maximize buttons don't work because NULL is not an object.
	[X] User Story: As an authenticated user, I can link to images.
	[X] User Story: As an authenticated user, I can delete images that I've linked to.
	[X] User Story: As an authenticated user, I can see a Pinterest-style wall of all the images I've linked to.

	[X] User Story: As an authenticated user, if I upload an image that is broken, it will be replaced by a placeholder image. (can use jQuery broken image detection)

Could even write your own broken image detection, just return a promise w/ HTTP response code reject !==200 basically.

//http://stackoverflow.com/a/92819/7316502
broken image error handling without JQUERY
function imgError(image) {
    image.onerror = "";
    image.src = "/images/noimage.gif";
    return true;
}

<img src="image.png" onerror="imgError(this);"/>

VIEWPORT PERCENTAGE LENGTHS! http://stackoverflow.com/a/19814948/7316502

[X] Should preface all IDs with a letter just in case you get an ID that starts with a number.

Something like this to handle mouse leaving the photogrid entirely, but it flickers:
document.querySelector('div.container').addEventListener('mouseover', mouseIn=true, false);
function handleMouseLeave(e) {
	mouseIn=false;
	setTimeout(function(){
		if(!mouseIn) { //remove the infobox
			document.querySelector('span#infoBox').style.display='none';
		}
	},2000);
}
document.querySelector('div.container').addEventListener('mouseout', handleMouseLeave, false);

//AUTH STUFF
[X] Right now you take the twitter username and set it as the site username. There is no "password" field set, so it's impossible to log in with a password. For Local user:
	-> if already logged in with Twitter, can simply add a password to go with that username
	-> if not logged in yet and tries to take a username that's taken, say "Hey, if this is you, you can log in here with Twitter, you can set a password".
	-> if it is not taken, set up a local username/password
	-> also establish TEST username/password test/test.
	-> if it is taken flash too bad try again
	-> if you start with a local account and want to link twitter, that's cool too, but you're stuck with whatever username you pick first, whether that's twitter or local
//
[X] Maximization on search page is funky.
[X] Add basic passport authentication strategy other than Oauth
[X] Images are displayed on the photo wall in REVERSE ORDER from the time they were added. Make the order descending instead.
[X] Kinda bug/kinda not: if you have two images with the same ID, the hover box is weird.
[X] Add an undo button
[X] Could handle image scaling better in the pop-up div.
[X] Straighten up the hover-over stuff on boxes
[X] TO-do make screen color/image border related to the color itself (given in the image)

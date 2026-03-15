---
aside of: "[[Home page]]"
---
## Topic ideas
* {{[[idea]]|Amillennialism}}
* {{[[idea]]|Design of the state}}
* {{[[idea]]|Doubt}}
* {{[[idea]]|Fasting}}
* {{[[idea]]|Lust}}
* {{[[idea]]|Premillennialism}}
* {{[[idea]]|Two resurrections}}
* {{[[idea]]|Worship}}

## Todos
* Find a place for the verses on this list: *[Verses Used to Support Arminianism](http://learntheology.com/verses-used-to-support-arminianism.html)* (used some of them in [[Free will]]).
* Look back through my emails to Dad and Steve.
* Look through my posts on Beliefnet.
* Look back through my blog posts. 
* Look back through documents on my computer. 
* Look back through documents on my documentation wiki.
* Browse my NASB Study Bible for underlined passages and notes.
* Browse my old LDS scriptures for underlines and notes.
* Harmonize passage lists about divinity and humanity being necessary for the atonement on [[Jesus is God]] (in the inferences section) and [[Hypostatic union]].

## Thinking about prepositions and the Trinity
“All things are from \[*ek*] him and through \[*dia*] him and to \[*eis*] him.” —Ro 11:36

Is there a sense in which these propositions can be mapped onto persons of the Trinity (e.g. 1Co 8:6 seems to apply from \[*ek*] to the Father and through \[*dia*] to the Son)? If so, can they be mapped on only one way, or can they be mapped in interchangeably? Instinct says to map them in order to the Father, Son, and Spirit, but, as D.A. Carson points out in *The Difficult Doctrine of the Love of God*, in the act of propitiation the Son is the subject and the Father the object of propitiation. Does this imply that the Spirit is the verb? Does this imply that propitiation is from the Son, through the Spirit, and to the Father? What other triune activities would mix up these prepositions? Is there a definite, obvious triune activity one could point to for each of the six ways to map these prepositions to the persons?

## Thinking about climate change
What if climate change is the next spectacular sin? God meant it for good but we meant it for evil. The religious and political leaders of Jesus day didn't understand him and they crucified him. The religious and political leaders of our day completely have their heads in the sand about climate change. Many of them think it doesn't matter what we do to the planet because the second coming is right around the corner anyway. But what if climate change is exactly the thing that will bring about all the apocalyptic destruction prophesied in the Bible? We have a mandate from God to take care of the planet. Not taking care of the planet because the end is nigh anyway, or worse, in an effort to usher in the second coming faster, is a sin of spectacular proportions.

## Topic suggestions from Steve

> What about verses for and against the possibility/necessity of continuing [[Revelation|revelation]], prophets, apostles, and [[Scripture]]? What about a list of verses for and against an [[Apostasy|apostasy]], a [[Restoration|restoration]]? What about a list of [[Unfulfilled prophecies|prophecies yet unfulfilled]] by Jesus when he came?

~(In the middle here I explained I don’t like having pages that focus too heavily on LDS doctrines.)~

> OK, I understand. Still, it seems that to truly consider whether the canon is closed and the Bible is *tota* and *sola Scriptura*, you should examine all biblical references with regard to the Bible, [[Scripture]], [[Revelation|revelation]], [[Prophets|prophets]], etc. That’s not a Mormon topic. Perhaps you have?

> And a page considering whether their might be further prophets and a latter-day [[Restoration|restoration]] and [[Scattering and gathering of Israel|gathering]] with additional [[Scripture]]...

—**Joey** 18:04, 9 January 2015 (UTC)

> As you mentioned yesterday, the [[Revelation|revelation]] page appears to be only one side of the issue. You might want to do an update and search for scriptures that support the opposite.

—**Joey** 19:11, 9 January 2015 (UTC)

[[c:Suggestions from Steve]]

## Things that convince me

*[An earlier version of my Topical Guide](http://kb.jday.us/view/Things_that_convince_me)* &mdash; check it for consistency. —**Joey** 01:25, 10 August 2009 (UTC)

## Anal retentive todo

Turn all the straight quotes in [[Special:Allmessages|system messages]] to curly quotes. (But only if I’m really bored.) —**Joey** 01:52, 18 August 2009 (UTC)

## Image copyright tags

Need to copy more of the [[w:Wikipedia:Image copyright tags|image copyright tags]] over from Wikipedia. —**Joey** 04:20, 20 August 2009 (UTC)

## Helpful encouragement from Grudem

> A good theological analysis must find and treat fairly all the relevant Bible passages for each particular topic, not just some or a few of the relevant passages.[^1]

> At various points there are—for all of us—biblical teachings which for one reason or another we do not want to accept. . . . In these areas, it is helpful for us to be confronted with the total weight of the teaching of Scripture on that subject, so that we will more readily be persuaded even against our initial wrongful inclinations.[^2]

> How could a student go about using the Bible to research its teachings on some new subject . . . ? The process would look like this: (1) Find all the relevant verses. . . . (2) Make notes on, and try to summarize the points made in the relevant verses. . . . (3) Summarize the teachings of the various verses into one or more points that the Bible affirms about that subject. . . . The process outlined above is possible for any Christian who can read his or her Bible and can look up words in a concordance. . . . It would be a tremendous help to the church if Christians generally would give much more time to searching out topics in Scripture for themselves and drawing conclusions in the way outlined above.[^3]

The study of theology is not merely a theoretical exercise of the intellect. It is a study of the living God, and of the wonders of all his works in creation and redemption. We cannot study this subject dispassionately! We must love all that God is, all that he says and all that he does. “You shall love the LORD your God with all your heart” (Dt 6:5). Our response to the study of the theology of Scripture should be that of the psalmist who said, “How precious to me are your thoughts, O God!” (Ps 139:17). In the study of the teachings of God’s Word, it should not surprise us if we often find our hearts spontaneously breaking forth in expressions of praise and delight like those of the psalmist: Ps 19:8; Ps 119:14; Ps 119:103; Ps 119:111; Ps 119:162.[^4]

—**Joey** 22:43, 8 June 2012 (UTC)

## TextWrangler regexes

Remove interwiki link:\
Search: `\[\[esv:[^|]+\|([^]]+)]]`\
Replace: `\1`

Combine verses from same book:\
Search: `((\d\s?)?[^\d\s:;]+)([\d\s:;]*);\s\1`\
Replace: `\1\3;`

Combine verses from same chapter:\
Search: `(\d+):([^;]+);\s+\1:([^;]+);`\
Replace: `\1:\2, \3;`

Change definition terms into headers:\
Search: `^;([^:]+):\s`\
Replace: `=== \1 ===\n`

## Perl regexes

Combine consecutive verses into ranges ~(from [PerlMonks](http://www.perlmonks.org/?node_id=87538))~:\
`perl -pi.bak -e '1 while s/(?<!\d)(\d+)(?:, ((??{$++1})))+(?!\d)/$1–$+/g;' x.txt`

Clean up an exported list of verses from Logos (convert newlines to semicolons first):\
`perl -pi.bak -e '1 while s/((\d\s?)?[^\d\s:;]+)([\d\s:;]*);\s\1/$1$3;/g; 1 while s/(\d+):([^;]+);\s+\1:([^;]+);/\1:\2, \3;/g; 1 while s/(?<!\d)(\d+)(?:, ((??{$++1})))+(?!\d)/$1–$+/g;' x.txt`

## Skinny

Merge diffs on <tt>main.css</tt> back into Skinny theme over on Perpetual Datebook Wiki. —**Joey** 21:08, 21 June 2012 (UTC)

:::{style="margin-left: 1em"}
Consider using symlinks from the Skinny folder under db.jday.us over to the Skinny folder under totascriptura.org. Then whenever I update the stylesheet for totascriptura.org, they automatically get updated for db.jday.us. Brilliant! —**Joey** 16:08, 22 June 2012 (UTC)
:::

## New project color scheme

* [Colour Lovers](http://www.colourlovers.com/business/trends/branding/7880/Papeterie_Haute-Ville_Logo)
* [Colorpeek](http://colorpeek.com/#113f8c,01a4a4,00a1cb,61ae24,d0d102,32742c,d70060,e54028,f18d05,616161,)

## Interesting verse

“It is beyond dispute that the inferior is blessed by the superior.” —Heb 7:7

You don’t necessarily have to read this in context, since the author uses this statement as the ground for an argument he’s making. He holds this to be self-evident. What are the implications of this idea? —**Joey** 16:04, 18 January 2014 (UTC)

## Should I upgrade to the latest MediaWiki?

What would the benefits be?
* 1.17 introduced modifying the footer with SkinTemplateOutputPageBeforeExec.
* 1.21 supports the &lt;mark&gt; HTML tag (I went ahead and modified Sanitizer.php to include support for this in v1.16).

What would I need to figure out beforehand?

* Have I modified any of the MediaWiki code base? I don’t think so, but it’s entirely possible.
	* Did I modify any special pages so they would work better with my Skinny skin?
	* How did I modify the page &lt;title&gt;?
* Will my skin work?
* Will my extensions work?

How would I do it?

* Copy the database to a new dev sandbox database
* Copy the files over to a new dev sandbox sub-domain
* Apply the update in the sandbox environment
* Poke around and see what's broken

## Jesus’ genes
Where did Jesus’ genetic material come from? A female could conceivably give birth asexually to another female, sometimes a clone of herself with one copy of each of her X-chromosomes, sometimes with two copies of one of her X-chromosomes. But without a Y-chromosome, Mary could not have given birth to a son (at least not from a genetic standpoint; obviously there are other difficulties in imagining asexual reproduction in the first place). So where did Jesus’ Y-chromosome come from?

## What did Jesus actually teach?
Mt 4:23; 9:35 say he was proclaiming the good news of the kingdom, but what does that mean? Was he teaching the Christian [[Gospel|gospel]] or some other good news? Analyze the content of Jesus’ parables and other teachings (big todo).

## In defense of proof texting
From Michael Allen and Scott R. Swain’s *Reformed Catholicity*, first, a caution:

> All of the charges brought against proof texting in Christian theology could be lodged against the Bible’s own use of the Bible. . . . [P]roof texting (as a citation technique) has biblical precedent and therefore should not be too hastily dismissed.[^5]

Next, two examples of theologians who used proof texting responsibly:

> For these theologians \[Aquinas and Calvin], proof texts did not subvert exegetical care—they symbolized and represented its necessity. Understanding the way that doctrines develop out of and beyond the explicit statements in biblical texts is crucial for grasping the kind of claim made when one gives a proof text: it does not necessarily suggest that the doctrine as stated can be found there, but it does claim that the doctrine is rooted there in principle, when viewed in its larger canonical lens and when its implications are fully teased out.[^6]

Finally, appeals to both systematic and Biblical theologians on how to think about proof texting:

> First, systematic theologians must be aware of the burden of proof upon them to show that they are using the Bible well in their theological construction. They should seek to promote a biblically saturated culture among fellow evangelical systematic theologians.[^7]

> Second, biblical scholars should expect rigorous exegesis to lie behind such proof texting and should engage it conversationally and not cynically. When reading an exegetical excursus or even a parenthetical reference within a dogmatic text, assume that it represents an attempt at teasing out valid implications from a portion of Scripture read in proper literary and canonical perspective.[^8]

The main reason I proof text without any commentary is that I worry my commentary might be interpreted as adding to or taking away from, or otherwise twisting, the Scriptures. Wherever possible I’ve done due diligence to make sure the passages I quote really do say what I claim they say about a given topic when considered exegetically in their proper context. Further, I’m confident enough in the clarity and convincing power of Scripture that I don’t feel the need to add my own comments (anything I could say will pale in comparison to what the Scriptures say). I’m confident anyone who reads those passages and takes the time to study them carefully for themselves will come to the same conclusions I have.

So, I make the same appeal as Allen and Swain: assume good faith. Assume I've done my homework and am responsibly citing Scriptures that really do say what I claim they say. Check them out for yourself. If you find one I've cited irresponsibly, by all means engage me thoughtfully, but don't write me off simply because I'm “proof texting”.

## Suggestion from Jonathan
In an e-mail on July 25, 2016:

> I suggest adding a page that addresses the biblical role of works/deeds/obedience etc. in salvation, reviewing both the Old and New Testaments.  This is an important topic that, I think, many people (Evangelical and LDS alike) misunderstand.  I would (of course) recommend taking a look at my “How to Be Saved?” page on everyverse.org.  http://everyverse.org/salvation/  :)

[[c:Suggestions from Jonathan]]

[^1]: Grudem, Wayne (2009). *Systematic Theology: An Introduction to Biblical Doctrine* (p. 24). Zondervan. Kindle Edition.

[^2]: Ibid., p. 28.

[^3]: Ibid., pp. 36–37.

[^4]: Ibid., p. 37.

[^5]: Allen, Michael; Swain, Scott R. (2015). *Reformed Catholicity: The Promise of Retrieval for Theology and Biblical Interpretation* (pp. 128–129). Baker Publishing Group. Kindle Edition.

[^6]: Ibid., pp. 136–137.

[^7]: Ibid., p. 137.

[^8]: Ibid., p. 139.

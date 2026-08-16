/* ═══════════════════════════════════════════════════════════════════
   SIXTEEN LIGHTS — chapter ledger
   The single source of truth for the whole experience. Copy, media,
   colour and pacing all live here; nothing is duplicated in markup.

   tint / tint2  → nebula + fog colours for that memory (0–1 linear-ish)
   motif         → particle behaviour: 0 petal · 1 bokeh · 2 dust
                                       3 leaf  · 4 firefly · 5 heart
   dwell         → relative scroll length of the beat
   ═══════════════════════════════════════════════════════════════════ */
window.SIXTEEN = (function () {
  'use strict';

  const c = (r, g, b) => [r / 255, g / 255, b / 255];

  const CHAPTERS = [
    {
      n: '01', act: 'Act I', year: '2013', mood: 'Soft golden dusk',
      title: 'Where It All Started',
      script: 'You know the story we lived…',
      serif: 'But do you remember where it all started?',
      gold: '2013 — our very first chapter',
      still: 'assets/thumbs/1.jpg', video: '1.mp4',
      tint: c(196, 138, 74), tint2: c(48, 28, 22), motif: 0, dwell: 1.15
    },
    {
      n: '02', act: 'Act I', year: '2013', mood: 'Warm nostalgia',
      title: 'Our First Chapter',
      script: 'Two people… one ordinary school…',
      serif: 'And a story neither of us knew would last this long.',
      gold: 'My school · 2013',
      still: 'assets/thumbs/2.jpg', video: '2.mp4',
      tint: c(206, 140, 100), tint2: c(52, 26, 30), motif: 0, dwell: 1.0
    },
    {
      n: '03', act: 'Act I', year: '2013', mood: 'Gentle anticipation',
      title: 'From Strangers to Us',
      script: 'We didn’t know it then…',
      serif: 'But we were already making memories we’d never give back.',
      gold: 'The beginning of us',
      still: 'assets/thumbs/3.jpg', video: '3.mp4',
      tint: c(190, 146, 86), tint2: c(42, 32, 22), motif: 0, dwell: 1.05
    },
    {
      n: '04', act: 'Act I', year: '2013 → now', mood: 'Bittersweet, split-era',
      title: 'Growing Together',
      script: 'We grew up. We changed. Life changed…',
      serif: 'But one thing never did.',
      gold: 'Us',
      still: 'assets/thumbs/4.jpg', video: '4.mp4',
      tint: c(158, 124, 168), tint2: c(32, 24, 46), motif: 2, dwell: 1.25
    },
    {
      n: '05', act: 'Act II', year: 'Hyderabad', mood: 'Warm amber comfort',
      title: 'Belposto Café',
      script: 'And somewhere along the way…',
      serif: 'We found little places that became part of our story.',
      gold: 'Belposto · our corner of the world',
      still: 'assets/thumbs/5.jpg', video: '5.mp4',
      tint: c(224, 130, 56), tint2: c(50, 26, 14), motif: 1, dwell: 1.0
    },
    {
      n: '06', act: 'Act II', year: 'Hyderabad', mood: 'Quiet intimacy',
      title: 'The Little Moments',
      script: 'Some places aren’t special because of where they are…',
      serif: 'They’re special because of who you’re with.',
      gold: 'Two cups · one table',
      still: 'assets/thumbs/6.jpg', video: '6.mp4',
      tint: c(208, 110, 54), tint2: c(46, 22, 14), motif: 1, dwell: 1.0
    },
    {
      n: '07', act: 'Act II', year: 'Golden hour', mood: 'Freedom at golden hour',
      title: 'Our Hyderabad Rides',
      script: 'And then there were the rides…',
      serif: 'Just you. Me. And the whole city moving past us.',
      gold: 'Our favourite way to get lost — together',
      still: 'assets/thumbs/7.jpg', video: '7.mp4',
      tint: c(236, 140, 62), tint2: c(56, 28, 16), motif: 2, dwell: 1.05
    },
    {
      n: '08', act: 'Act II', year: 'After dark', mood: 'Magical glow',
      title: 'Hyderabad at Night',
      script: 'No destination. No plans. Just us.',
      serif: 'And somehow… those were always the best rides.',
      gold: 'City lights · no map',
      still: 'assets/thumbs/8.jpg', video: '8.mp4',
      tint: c(96, 122, 214), tint2: c(12, 16, 42), motif: 1, dwell: 1.0
    },
    {
      n: '09', act: 'Act III', year: 'Dandeli', mood: 'Wild and quiet',
      title: 'The Dandeli Chapter',
      script: 'And then we escaped the city…',
      serif: 'To somewhere a little quieter, a little greener.',
      gold: 'Dandeli · one of our favourite escapes',
      still: 'assets/thumbs/9.jpg', video: '9.mp4',
      tint: c(92, 172, 118), tint2: c(14, 36, 28), motif: 3, dwell: 1.05
    },
    {
      n: '10', act: 'Act III', year: 'Dandeli', mood: 'Tender connection',
      title: 'Dandeli, Together',
      script: 'We went looking for an adventure…',
      serif: 'And came back holding another memory.',
      gold: 'Just the river, and us',
      still: 'assets/thumbs/10.jpg', video: '10.mp4',
      tint: c(176, 166, 84), tint2: c(28, 38, 22), motif: 3, dwell: 1.15
    },
    {
      n: '11', act: 'Act IV', year: '2013 → now', mood: 'Emotional climax',
      title: 'Look How Far We’ve Come',
      script: '2013… and now…',
      serif: 'Time passed. Everything moved. We didn’t.',
      gold: 'Look how far we’ve come',
      still: 'assets/thumbs/11.jpg', video: '11.mp4',
      tint: c(184, 118, 152), tint2: c(38, 22, 44), motif: 2, dwell: 1.3
    },
    {
      n: '12', act: 'Act IV', year: 'Keepsakes', mood: 'Quiet keepsakes',
      title: 'All the Little Things',
      script: 'It was never just the big moments…',
      serif: 'It was every small one in between.',
      gold: 'Notebooks · coffee cups · a bike key',
      still: 'assets/thumbs/12.jpg', video: '12.mp4',
      tint: c(192, 144, 84), tint2: c(44, 30, 20), motif: 2, dwell: 1.05
    },
    {
      n: '13', act: 'Act IV', year: 'Tonight', mood: 'Dreamlike romance',
      title: 'My Favourite Part',
      script: 'Somewhere between 2013 and today…',
      serif: 'You became more than a part of my story.',
      gold: 'You became my favourite part',
      still: 'assets/thumbs/13.jpg', video: '13.mp4',
      tint: c(88, 106, 196), tint2: c(12, 16, 38), motif: 4, dwell: 1.2
    },
    {
      n: '14', act: 'Act V', year: 'Her birthday', mood: 'Joyful surprise',
      title: 'And Today Is Yours',
      script: 'And today…',
      serif: 'It’s your turn to be the one celebrated.',
      gold: 'Close your eyes',
      still: 'assets/thumbs/14.jpg', video: '14.mp4',
      tint: c(226, 116, 124), tint2: c(50, 20, 30), motif: 4, dwell: 1.15
    },
    {
      n: '15', act: 'Act V', year: 'Everything', mood: 'Cinematic remembrance',
      title: 'Everything, All at Once',
      script: 'From a school in 2013… to countless memories.',
      serif: 'To every ordinary day you turned into something special.',
      gold: 'Thank you for being my story',
      still: 'assets/thumbs/15.jpg', video: '15.mp4',
      tint: c(198, 124, 120), tint2: c(40, 24, 32), motif: 5, dwell: 1.3
    },
    {
      n: '16', act: 'Act V', year: 'Forever', mood: 'Cinematic ending',
      title: 'I’d Still Choose You',
      script: 'And after all these years…',
      serif: 'If I had to choose all over again — I’d still choose you.',
      gold: 'Happy Birthday, my love · 2013 → Forever',
      still: 'assets/thumbs/16.jpg', video: '16.mp4',
      tint: c(226, 96, 140), tint2: c(48, 16, 38), motif: 5, dwell: 1.0
    }
  ];

  /* The letter, revealed word by word as you scroll through it. */
  const LETTER = [
    'Twelve years ago a school corridor introduced two people who had no idea',
    'what they were starting. We were kids. We were loud. We were certain about',
    'nothing except the next afternoon. And somehow, quietly, without ever',
    'announcing itself, that afternoon kept repeating until it became a life.',
    'We collected a city. Belposto in the evenings, the long ride home when',
    'neither of us wanted the day to end, Dandeli when the noise got too much,',
    'and a thousand ordinary Tuesdays that nobody would put in a film — except',
    'they are the film. Everything moved. Everything changed. We didn’t.',
    'So here is the whole thing, in sixteen lights, for you.',
    'Happy birthday, Pandu. I’d still choose you. Every single time.'
  ];

  return { CHAPTERS, LETTER };
})();

export const COURSES = {
  "English and Writing": [
    {
      title: "Writing and Communication",
      book: "Writing Guide with Handbook",
      authors: "Michelle Bachelor Robinson, Maria Jerskey",
    },
    {
      title: "Rhetoric and Composition",
      book: "Rhetoric and Research Writing",
      authors: "Terri Pantuso",
    },
    {
      title: "Academic English Composition",
      book: "English Composition",
      authors:
        "Ann Inoshita, Karyl Garland, Kate Sims, Jeanne Giesbrecht, Beverly Neiderman",
    },
  ],
  "Humanities and Social Sciences": [
    {
      title: "Introduction to Psychology",
      book: "Introduction to Psychology",
      authors: "Rose M. Spielman",
    },
    {
      title: "Introduction to Sociology",
      book: "Introduction to Sociology",
      authors: "Tonja R. Conerly, Kathleen Holmes, Asha Lal Tamang",
    },
    {
      title: "United States History",
      book: "U.S. History",
      authors:
        "P. Scott Corbett, Volker Janssen, John M. Lund, Todd Pfannestiel, Paul Vickery, Sylvie Waskiewicz",
    },
    {
      title: "World History I",
      book: "World History, Volume 1",
      authors: "Ann Kordas, Ryan J. Lynch, Brooke Nelson, Julie Tatlock",
    },
    {
      title: "World History II",
      book: "World History, Volume 2",
      authors: "Ann Kordas, Ryan J. Lynch, Brooke Nelson, Julie Tatlock",
    },
    {
      title: "American Government and Politics",
      book: "American Government",
      authors: "Glen Krutz, Sylvie Waskiewicz",
    },
    {
      title: "Introduction to Philosophy",
      book: "Introduction to Philosophy",
      authors: "Nathan Smith",
    },
    {
      title: "Introduction to Anthropology",
      book: "Introduction to Anthropology",
      authors: "Jennifer Hasty, David G. Lewis, Marjorie M. Snipes",
    },
  ],
  "Economics and Business": [
    {
      title: "Microeconomics",
      book: "Principles of Microeconomics",
      authors: "Steven A. Greenlaw, David Shapiro",
    },
    {
      title: "Macroeconomics",
      book: "Principles of Macroeconomics",
      authors: "Steven A. Greenlaw, David Shapiro",
    },
    {
      title: "Entrepreneurship and Innovation",
      book: "Entrepreneurship",
      authors: "Michael Laverty, Chris Littel",
    },
    {
      title: "Business Ethics",
      book: "Business Ethics",
      authors: "Stephen M. Byars, Kurt Stanberry",
    },
    {
      title: "Foundations of Finance",
      book: "Principles of Finance",
      authors: "Julie Dahlquist, Rainford Knight",
    },
    {
      title: "Organizational Behavior",
      book: "Organizational Behavior",
      authors: "J. Stewart Black, David S. Bright",
    },
  ],
  Sciences: [
    {
      title: "Biology",
      book: "Biology, 2nd Edition",
      authors: "Mary Ann Clark, Matthew Douglas, Jung Choi",
    },
    {
      title: "Concepts of Biology",
      book: "Concepts of Biology",
      authors: "Samantha Fowler, Rebecca Roush, James Wise",
    },
    {
      title: "Chemistry",
      book: "Chemistry, 2nd Edition",
      authors:
        "Paul Flowers, Klaus Theopold, Richard Langley, William R. Robinson",
    },
    {
      title: "Anatomy and Physiology",
      book: "Anatomy and Physiology",
      authors:
        "J. Gordon Betts, Kelly A. Young, James A. Wise, Eddie Johnson, Brandon Poe",
    },
    {
      title: "Environmental Science",
      book: "Environmental Science",
      authors: "Various contributors",
    },
    {
      title: "University Physics",
      book: "University Physics, Volume 1",
      authors: "Samuel J. Ling, Jeff Sanny, William Moebs",
    },
  ],
  "Mathematics and Statistics": [
    {
      title: "Statistics",
      book: "Statistics",
      authors: "Barbara Illowsky, Susan Dean",
    },
    {
      title: "Precalculus",
      book: "Precalculus",
      authors: "Jay Abramson",
    },
    {
      title: "Algebra and Trigonometry",
      book: "Algebra and Trigonometry",
      authors: "Jay Abramson",
    },
    {
      title: "Calculus I",
      book: "Calculus, Volume 1",
      authors: "Gilbert Strang, Edwin Herman",
    },
  ],
  "Advanced and AP": [
    {
      title: "AP Psychology",
      book: "Psychology (AP Edition)",
      authors: "Rose M. Spielman",
    },
    {
      title: "AP Microeconomics",
      book: "Microeconomics (AP Edition)",
      authors: "Steven A. Greenlaw, David Shapiro",
    },
    {
      title: "AP United States History",
      book: "U.S. History (AP Edition)",
      authors: "P. Scott Corbett et al.",
    },
    {
      title: "AP Statistics",
      book: "Statistics (AP Edition)",
      authors: "Barbara Illowsky, Susan Dean",
    },
  ],
};

export const COURSE_LIST = Object.values(COURSES).flat();

export const getCourse = (title) =>
  COURSE_LIST.find((c) => c.title === title) || {
    title,
    book: title,
    authors: "",
  };

export const GRADE_LEVELS = [
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "Post-Graduate",
  "Mixed / Flexible",
];

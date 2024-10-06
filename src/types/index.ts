export interface Link {
  title: string;
  type: string;
  url: string;
}

export interface Subsection {
  name: string;
  links: Link[];
}

export interface Section {
  name: string;
  description: string;
  subsections: Subsection[];
}

export interface JsonData {
  title: string;
  sections: Section[];
}

export interface SessionData {
  step: 'idle' | 'choose_section' | 'choose_subsection' | 'enter_title' | 'enter_type' | 'enter_url' | 'confirm';
  newLink: Partial<Link & { section: string; subsection: string }>;
  lastMessageId?: number;
}


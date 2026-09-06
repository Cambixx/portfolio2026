import enSite from '../data/en/site.json';
import enHero from '../data/en/hero.json';
import enProjects from '../data/en/projects.json';
import enExperience from '../data/en/experience.json';
import enEducation from '../data/en/education.json';
import enStack from '../data/en/stack.json';
import enContact from '../data/en/contact.json';
import enUi from '../data/en/ui.json';

import esSite from '../data/es/site.json';
import esHero from '../data/es/hero.json';
import esProjects from '../data/es/projects.json';
import esExperience from '../data/es/experience.json';
import esEducation from '../data/es/education.json';
import esStack from '../data/es/stack.json';
import esContact from '../data/es/contact.json';
import esUi from '../data/es/ui.json';

export const LANGUAGES = ['en', 'es'];
export const DEFAULT_LANGUAGE = 'en';

export const CONTENT = {
    en: {
        site: enSite,
        hero: enHero,
        projects: enProjects,
        experience: enExperience,
        education: enEducation,
        stack: enStack,
        contact: enContact,
        ui: enUi,
    },
    es: {
        site: esSite,
        hero: esHero,
        projects: esProjects,
        experience: esExperience,
        education: esEducation,
        stack: esStack,
        contact: esContact,
        ui: esUi,
    },
};

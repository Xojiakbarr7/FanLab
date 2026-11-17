import html from '../legacy/index.html?raw';
import {serveLab} from './serve-lab';
export const dynamic='force-dynamic';
export async function GET(){return serveLab(html)}

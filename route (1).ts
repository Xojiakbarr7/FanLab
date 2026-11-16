import html from '../../legacy/experiments.html?raw';
import {serveLab} from '../serve-lab';
export const dynamic='force-dynamic';
export async function GET(){return serveLab(html)}

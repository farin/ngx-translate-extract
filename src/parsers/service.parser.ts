import { ClassDeclaration, CallExpression } from 'typescript';
import { tsquery } from '@phenomnomnominal/tsquery';

import { ParserInterface } from './parser.interface.js';
import { TranslationCollection } from '../utils/translation.collection.js';
import {
	findClassDeclarations,
	findClassPropertyByType,
	findPropertyCallExpressions,
	findMethodCallExpressions,
	getStringsFromExpression,
	findMethodParameterByType,
	findConstructorDeclaration
} from '../utils/ast-helpers.js';

const TRANSLATE_SERVICE_TYPE_REFERENCES = ['TranslateService', 'LanguageService'];
const TRANSLATE_SERVICE_METHOD_NAMES = ['get', 'instant', 'stream'];

export class ServiceParser implements ParserInterface {
	public extract(source: string, filePath: string): TranslationCollection | null {
		const sourceFile = tsquery.ast(source, filePath);

		const classDeclarations = findClassDeclarations(sourceFile);
		if (!classDeclarations) {
			return null;
		}

		let collection: TranslationCollection = new TranslationCollection();

		classDeclarations.forEach((classDeclaration) => {
			const callExpressions = [
				...this.findConstructorParamCallExpressions(classDeclaration),
				...this.findPropertyCallExpressions(classDeclaration)
			];

			callExpressions.forEach((callExpression) => {
				const [firstArg] = callExpression.arguments;
				if (!firstArg) {
					return;
				}
				const strings = getStringsFromExpression(firstArg);
				collection = collection.addKeys(strings);
			});
		});
		return collection;
	}

	protected findConstructorParamCallExpressions(classDeclaration: ClassDeclaration): CallExpression[] {
		const constructorDeclaration = findConstructorDeclaration(classDeclaration);
		if (!constructorDeclaration) {
			return [];
		}
		const expressions: CallExpression[] = []
		TRANSLATE_SERVICE_TYPE_REFERENCES.forEach(ref => {
			const paramName = findMethodParameterByType(constructorDeclaration, ref);
			expressions.push(...findMethodCallExpressions(constructorDeclaration, paramName, TRANSLATE_SERVICE_METHOD_NAMES));
		})
		return expressions
	}

	protected findPropertyCallExpressions(classDeclaration: ClassDeclaration): CallExpression[] {
		const expressions: CallExpression[] = []
		TRANSLATE_SERVICE_TYPE_REFERENCES.forEach(ref => {
			const propName: string = findClassPropertyByType(classDeclaration, ref);
			if (propName) {
				expressions.push(...findPropertyCallExpressions(classDeclaration, propName, TRANSLATE_SERVICE_METHOD_NAMES));
			}
		})
		return expressions;
	}
}

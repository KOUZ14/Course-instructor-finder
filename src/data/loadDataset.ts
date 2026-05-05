import dataset from "./sjsu-sample-dataset.json";
import type { CourseDataset } from "../domain/types";
import { validateCourseDataset } from "./validateDataset";

export { validateCourseDataset } from "./validateDataset";

/**
 * Loads the bundled static course dataset used by the MVP.
 */
export function loadDataset(): CourseDataset {
  return validateCourseDataset(dataset);
}

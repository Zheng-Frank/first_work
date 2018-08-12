import { Task } from "./task";
import { ApiService } from "../../services/api.service";

/**
 * @desc An action is performed on a task, causing changes of the task 
 * 
 */
export interface TaskObject {
    name: string;
    _id: string;
}

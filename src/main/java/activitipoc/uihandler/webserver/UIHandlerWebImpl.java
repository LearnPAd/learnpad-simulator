/**
 *
 */
package activitipoc.uihandler.webserver;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

import javax.servlet.ServletException;

import org.eclipse.jetty.servlet.ServletHolder;

import activitipoc.IFormHandler;
import activitipoc.IProcessDispatcher;
import activitipoc.IProcessManager;
import activitipoc.IUIHandler;

/**
 * @author jorquera
 *
 */
public class UIHandlerWebImpl implements IUIHandler {

	private final IFormHandler formHandler;
	private final Map<String, IProcessDispatcher> processDispatchers = new HashMap<String, IProcessDispatcher>();
	private final Map<String, Collection<String>> processToUsers = new HashMap<String, Collection<String>>();
	private final WebServer webserver;
	private final Map<String, UIServlet> usersMap;
	private final Map<String, Collection<String>> tasksToUsers = new HashMap<String, Collection<String>>();
	private final Map<String, ServletHolder> tasksMap = new HashMap<String, ServletHolder>();

	/**
	 * @param webserver
	 * @param users
	 * @param taskService
	 * @throws Exception
	 */
	public UIHandlerWebImpl(int port, Collection<String> users,
			IProcessManager processManager, IFormHandler formHandler)
			throws Exception {
		super();
		this.formHandler = formHandler;
		this.usersMap = new HashMap<String, UIServlet>();

		// launch task webserver
		this.webserver = new WebServer(port, "ui", "tasks", "process",
				new UIProcessServlet(processManager, this, formHandler));

		// instanciate users UI
		for (String user : users) {
			UIServlet ui = new UIServlet(user);
			this.webserver.addUIServlet(ui, user);
			usersMap.put(user, ui);
		}

	}

	/*
	 * (non-Javadoc)
	 *
	 * @see activitipoc.IUIHandler#addUser(java.lang.String)
	 */
	public void addUser(String userId) {
		UIServlet ui = new UIServlet(userId);
		webserver.addUIServlet(ui, userId);
		usersMap.put(userId, ui);
	}

	/*
	 * (non-Javadoc)
	 *
	 * @see activitipoc.IUIHandler#removeUser(java.lang.String)
	 */
	public void removeUser(String userId) {

		// TODO
		// webserver.removeServletHolder(usersMap.get(userId));
	}

	/*
	 * (non-Javadoc)
	 *
	 * @see activitipoc.IUIHandler#getUsers()
	 */
	public Collection<String> getUsers() {
		return new HashSet<String>(usersMap.keySet());
	}

	/*
	 * (non-Javadoc)
	 *
	 * @see activitipoc.IUIHandler#addProcess(java.lang.String,
	 * Collection<String>, ProcessDispatcher)
	 */
	public void addProcess(String process, Collection<String> users,
			IProcessDispatcher dispatcher) {
		processDispatchers.put(process, dispatcher);
		processToUsers.put(process, users);
	}

	/*
	 * (non-Javadoc)
	 *
	 * @see activitipoc.IUIHandler#sendTask(java.lang.String, java.util.Set)
	 */
	public void sendTask(String processId, String taskId, String taskDescr,
			Collection<String> users) {

		tasksMap.put(taskId, webserver.addTaskServlet(new TaskServlet(this,
				processId, taskId, taskDescr, formHandler), taskId));
		tasksToUsers.put(taskId, users);

		// note: it is important to signal new tasks to users *after* having
		// created the corresponding servlet otherwise the user may try to
		// connect to the task before it is available
		for (String user : users) {
			usersMap.get(user).addTask(taskId);
		}
	}

	/*
	 * (non-Javadoc)
	 *
	 * @see activitipoc.IUIHandler#signalProcessEnd(java.lang.String,
	 * java.util.Set)
	 */
	public void signalProcessEnd(String processId) {
		for (String userId : processToUsers.get(processId)) {
			usersMap.get(userId).completeProcess(processId);
		}
		processDispatchers.remove(processId);
		processToUsers.remove(processId);

	}

	public void completeTask(String processId, String taskId, String data) {

		// signal task completion to dispatcher and check validation
		boolean validated = processDispatchers.get(processId)
				.submitTaskCompletion(taskId,
						formHandler.parseResult(data).getProperties());

		if (validated) {
			// signal task completion to users
			try {
				((TaskServlet) tasksMap.get(taskId).getServlet())
						.validateTask();
			} catch (ServletException e) {
				e.printStackTrace();
			}

			for (String userId : tasksToUsers.get(taskId)) {
				usersMap.get(userId).removeTask(taskId);
			}

			// remove task ui from webserver
			webserver.removeServletHolder(tasksMap.get(taskId));

			tasksToUsers.remove(taskId);
			tasksMap.remove(taskId);
		} else {
			try {
				((TaskServlet) tasksMap.get(taskId).getServlet())
						.resubmitTask();
			} catch (ServletException e) {
				e.printStackTrace();
			}
		}

	}
}

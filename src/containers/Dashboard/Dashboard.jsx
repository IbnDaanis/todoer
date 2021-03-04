import { useState, useEffect, useRef } from 'react'
import {
  AddTask,
  AddTaskText,
  DashboardContainer,
  PlusButton,
  ProjectContainer,
  Title,
  UndoNotification,
  UndoContainer,
  UndoText,
  UndoButton,
  UndoCloseButton,
  TaskContainer,
  ProjectHeading,
} from './DashboardStyles'
import { AddTaskForm, Spinner, TaskItem } from '../../components'

import { useDispatch, useSelector } from 'react-redux'
import { getProjectTasks } from '../../store/actions/projectActions'
import { completeTask, getAllTasks } from '../../store/actions/taskActions'
import { Sidebar } from '../Sidebar/Sidebar'
import { PROJECT_TASKS_DETAILS_CLEAR } from '../../store/constants/projectConstants'
import { ReactComponent as PlusButtonSVG } from '../../assets/images/plus-icon.svg'

import { ReactComponent as CloseIcon } from '../../assets/images/x-icon.svg'
import { format } from 'date-fns'
import { AddTaskContainer } from '../../components/AddTaskForm/AddTaskFormStyles'
import { useScrollToBottom } from '../../hooks/useScrollToBottom'
import { useCheckScrolling } from '../../hooks/useCheckScrolling'

export const Dashboard = ({ history, match, isClosed }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)

  const [currentProject, setCurrentProject] = useState(null)
  const [dashboardTasks, setDashboardTasks] = useState([])
  const [tasksToComplete, setTasksToComplete] = useState([])
  const [isUndoVisible, setIsUndoVisible] = useState(false)

  const dispatch = useDispatch()
  const { id } = match.params

  const isProject = id !== 'today' && id !== 'upcoming'

  const projectList = useSelector(state => state.projectList)
  const { loading: projectsLoading, projects } = projectList

  const projectTasks = useSelector(state => state.projectTasks)
  const { loading: tasksLoading, tasks: projectTaskList } = projectTasks

  const taskList = useSelector(state => state.taskList)
  const { loading: taskListLoading, tasks: allTasks } = taskList

  useEffect(() => {
    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
    }, 500)
  }, [currentProject])

  const assignCurrentProject = () => {
    const [current] = projects?.filter(
      project => project.title.toLowerCase() === match.params.id
    )
    setCurrentProject(() => current)
  }

  const fetchTasks = param => {
    if (!projectsLoading) {
      setCurrentProject(null)
      if (param === 'today') {
        dispatch(
          getAllTasks({
            field: 'dueDate',
            condition: '==',
            query: format(new Date(), 'yyyy-MM-dd'),
          })
        )
      } else if (param === 'upcoming') {
        dispatch(
          getAllTasks({
            field: 'dueDate',
            condition: '>',
            query: format(new Date(), 'yyyy-MM-dd'),
          })
        )
      } else {
        assignCurrentProject()
        currentProject && dispatch(getProjectTasks(currentProject.title))
      }
    }
  }

  useEffect(() => {
    fetchTasks(id)
  }, [dispatch, id, projects, currentProject])

  useEffect(() => {
    dispatch({
      type: PROJECT_TASKS_DETAILS_CLEAR,
    })
  }, [currentProject])

  const sortByDate = (a, b) => a.createdAt - b.createdAt

  useEffect(() => {
    !isProject && setDashboardTasks(allTasks?.sort(sortByDate))
    isProject && setDashboardTasks(projectTaskList?.sort(sortByDate))
  }, [allTasks, projectTaskList, projectsLoading, isProject, dashboardTasks])

  // useEffect(() => {
  //   console.clear()
  //   console.log('Dashboard =>', dashboardTasks, allTasks)
  // }, [dashboardTasks, allTasks])

  useEffect(() => {
    if (projects) {
      const projectExists = projects.some(
        project => project.title.toLowerCase() === id
      )
      if (!isProject || projectExists) return
      history.push('/app/today')
    }
  }, [currentProject, isProject, id, projects])

  let timer

  const completeSelectedTask = () => {
    timer = setTimeout(() => {
      tasksToComplete.forEach(task => {
        const { project, id } = task
        dispatch(completeTask(project, id))
      })
      setIsUndoVisible(false)
    }, 5000)
  }

  const cancelCompleteTask = () => {
    clearTimeout(timer)
    setTasksToComplete([])
    setIsUndoVisible(false)
  }

  const clearTime = () => {
    clearTimeout(timer)
  }

  useEffect(() => {
    if (tasksToComplete.length) {
      completeSelectedTask()
    }
  }, [tasksToComplete, timer])

  const dashboard = useRef()

  useScrollToBottom(dashboard, dashboardTasks, projectTaskList, dashboardTasks)
  useCheckScrolling(dashboard, setIsScrolling)

  return (
    <>
      <div>
        <Sidebar isClosed={isClosed} param={id} history={history} />
        <DashboardContainer className={isClosed && 'closed'} ref={dashboard}>
          <ProjectContainer>
            <ProjectHeading>
              <div className={`div ${isScrolling ? 'scrolling ' : undefined}`}>
                <Title>
                  {match.params.id}
                  {match.params.id === 'today' && (
                    <small>{format(new Date(), 'iii do MMM')}</small>
                  )}
                </Title>
              </div>
            </ProjectHeading>
            <TaskContainer>
              {isLoading ||
              projectsLoading ||
              tasksLoading ||
              taskListLoading ? (
                <div style={{ marginTop: '10rem' }}>
                  <Spinner />
                </div>
              ) : (
                dashboardTasks && (
                  <>
                    <div className='tasks'>
                      <ul>
                        {dashboardTasks
                          .filter(task => !task.isComplete)
                          .map(task => (
                            <TaskItem
                              key={task.id}
                              task={task}
                              tasksToComplete={tasksToComplete}
                              setTasksToComplete={setTasksToComplete}
                              setIsUndoVisible={setIsUndoVisible}
                              clearTime={clearTime}
                            />
                          ))}
                      </ul>
                    </div>
                    <AddTaskContainer>
                      {!isOpen ? (
                        <AddTask onClick={() => setIsOpen(!isOpen)}>
                          <PlusButton className='plus'>
                            <PlusButtonSVG />
                          </PlusButton>
                          <AddTaskText>Add task</AddTaskText>
                        </AddTask>
                      ) : (
                        <AddTaskForm
                          history={history}
                          setIsOpen={setIsOpen}
                          currentProject={currentProject}
                          id='taskForm'
                        />
                      )}
                    </AddTaskContainer>
                  </>
                )
              )}
            </TaskContainer>
          </ProjectContainer>
        </DashboardContainer>
      </div>
      {isUndoVisible && (
        <UndoNotification>
          <UndoContainer>
            <UndoText>
              {tasksToComplete.length > 1
                ? `${tasksToComplete.length} tasks completed`
                : `${tasksToComplete.length} task completed`}
            </UndoText>
            <UndoButton type='button' onClick={() => cancelCompleteTask()}>
              Undo
            </UndoButton>
            <UndoCloseButton
              type='button'
              onClick={() => setIsUndoVisible(false)}
            >
              <CloseIcon />
            </UndoCloseButton>
          </UndoContainer>
        </UndoNotification>
      )}
    </>
  )
}

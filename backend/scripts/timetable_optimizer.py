#!/usr/bin/env python3
"""
Timetable Optimization Script using Google OR-Tools
Implements constraints C1-C7 for optimal timetable generation
"""

import json
import sys
import logging
from ortools.sat.python import cp_model
from typing import Dict, List, Any, Tuple
import time
from io import StringIO

class TimetableOptimizer:
    def __init__(self, data: Dict[str, Any]):
        self.data = data
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        
        # Setup logging to capture debug messages
        self.log_stream = StringIO()
        self.logger = logging.getLogger('timetable_optimizer')
        self.logger.setLevel(logging.DEBUG)
        handler = logging.StreamHandler(self.log_stream)
        handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
        self.logger.addHandler(handler)
        
        # Extract data
        self.department = data['department']
        self.subjects = data['subjects']
        self.rooms = data['rooms']
        self.constraints = data['constraints']
        
        # Constants
        self.DAYS = self.constraints['days_per_week']  # 5 days (Mon-Fri)
        self.PERIODS = self.constraints['periods_per_day']  # 8 periods per day
        self.LAB_DURATION = self.constraints['lab_duration']  # 3 continuous periods

        # Normalize morning/evening periods to explicit lists of indices
        raw_morning = self.constraints.get('morning_periods', [0, 1, 2, 3])
        raw_evening = self.constraints.get('evening_periods', [4, 5, 6, 7])

        if isinstance(raw_morning, int) and isinstance(raw_evening, int):
            # Interpret as counts: morning starts at 0, evening follows morning
            morning_count = max(0, raw_morning)
            evening_count = max(0, raw_evening)
            self.MORNING_PERIODS_LIST = list(range(0, min(self.PERIODS, morning_count)))
            self.EVENING_PERIODS_LIST = list(
                range(
                    len(self.MORNING_PERIODS_LIST),
                    min(self.PERIODS, len(self.MORNING_PERIODS_LIST) + evening_count)
                )
            )
        else:
            # Interpret as explicit indices
            self.MORNING_PERIODS_LIST = list(raw_morning) if isinstance(raw_morning, (list, tuple)) else [0, 1, 2, 3]
            self.EVENING_PERIODS_LIST = list(raw_evening) if isinstance(raw_evening, (list, tuple)) else [4, 5, 6, 7]

        # Ensure indices are within bounds and sorted
        self.MORNING_PERIODS_LIST = sorted([p for p in self.MORNING_PERIODS_LIST if 0 <= p < self.PERIODS])
        self.EVENING_PERIODS_LIST = sorted([p for p in self.EVENING_PERIODS_LIST if 0 <= p < self.PERIODS])
        
        # Variables
        self.schedule_vars = {}
        self.room_assignment = {}
        self.teacher_assignment = {}
        
        # Statistics
        self.stats = {
            'total_variables': 0,
            'total_constraints': 0,
            'optimization_time': 0,
            'solver_status': '',
            'conflicts_resolved': 0,
            'input_summary': {
                'subjects_count': len(self.subjects),
                'rooms_count': len(self.rooms),
                'department': self.department['name']
            }
        }
    
    def create_variables(self):
        """Create decision variables for the optimization model"""
        self.logger.debug("Creating decision variables...")
        
        # Main schedule variables: schedule[subject_id][day][period] = 1 if scheduled
        for subject in self.subjects:
            subject_id = subject['id']
            self.schedule_vars[subject_id] = {}
            
            for day in range(self.DAYS):
                self.schedule_vars[subject_id][day] = {}
                for period in range(self.PERIODS):
                    var_name = f'schedule_s{subject_id}_d{day}_p{period}'
                    self.schedule_vars[subject_id][day][period] = self.model.NewBoolVar(var_name)
                    self.stats['total_variables'] += 1
        
        # Room assignment variables: room_assignment[subject_id][day][period][room_id] = 1 if assigned
        for subject in self.subjects:
            subject_id = subject['id']
            self.room_assignment[subject_id] = {}
            
            for day in range(self.DAYS):
                self.room_assignment[subject_id][day] = {}
                for period in range(self.PERIODS):
                    self.room_assignment[subject_id][day][period] = {}
                    for room in self.rooms:
                        room_id = room['id']
                        # Only assign appropriate room types
                        if (subject['is_lab'] and room['type'] == 'laboratory') or \
                           (not subject['is_lab'] and room['type'] == 'classroom'):
                            var_name = f'room_s{subject_id}_d{day}_p{period}_r{room_id}'
                            self.room_assignment[subject_id][day][period][room_id] = self.model.NewBoolVar(var_name)
                            self.stats['total_variables'] += 1
        
        self.logger.debug(f"Created {self.stats['total_variables']} variables")
    
    def add_basic_constraints(self):
        """Add basic scheduling constraints"""
        self.logger.debug("Adding basic constraints...")
        constraint_count = 0
        
        # Each subject must be scheduled for its required periods per week
        for subject in self.subjects:
            subject_id = subject['id']
            periods_per_week = subject['max_periods_per_week']
            
            total_periods = []
            for day in range(self.DAYS):
                for period in range(self.PERIODS):
                    total_periods.append(self.schedule_vars[subject_id][day][period])
            
            self.model.Add(sum(total_periods) == periods_per_week)
            constraint_count += 1
        
        # Each subject can have at most max_periods_per_day per day
        for subject in self.subjects:
            subject_id = subject['id']
            max_per_day = subject['max_periods_per_day']
            
            for day in range(self.DAYS):
                daily_periods = []
                for period in range(self.PERIODS):
                    daily_periods.append(self.schedule_vars[subject_id][day][period])
                
                self.model.Add(sum(daily_periods) <= max_per_day)
                constraint_count += 1
        
        # Room assignment consistency
        for subject in self.subjects:
            subject_id = subject['id']
            for day in range(self.DAYS):
                for period in range(self.PERIODS):
                    # If subject is scheduled, exactly one room must be assigned
                    room_assignments = []
                    for room_id in self.room_assignment[subject_id][day][period]:
                        room_assignments.append(self.room_assignment[subject_id][day][period][room_id])
                    
                    if room_assignments:
                        # Room assignment equals schedule variable
                        self.model.Add(sum(room_assignments) == self.schedule_vars[subject_id][day][period])
                        constraint_count += 1
        
        self.stats['total_constraints'] += constraint_count
        self.logger.debug(f"Added {constraint_count} basic constraints")
    
    def add_constraint_c1_room_conflicts(self):
        """C1: No two classes in the same room at the same time within a department"""
        self.logger.debug("Adding C1: Room conflict constraints...")
        constraint_count = 0
        
        for room in self.rooms:
            room_id = room['id']
            for day in range(self.DAYS):
                for period in range(self.PERIODS):
                    # Collect all subjects that could use this room at this time
                    room_users = []
                    for subject in self.subjects:
                        subject_id = subject['id']
                        if room_id in self.room_assignment[subject_id][day][period]:
                            room_users.append(self.room_assignment[subject_id][day][period][room_id])
                    
                    # At most one subject can use the room at any time
                    if len(room_users) > 1:
                        self.model.Add(sum(room_users) <= 1)
                        constraint_count += 1
        
        self.stats['total_constraints'] += constraint_count
        self.logger.debug(f"Added {constraint_count} room conflict constraints")
    
    def add_constraint_c2_session_separation(self):
        """C2: Timetable should be scheduled separately for morning and evening sessions"""
        self.logger.debug("Adding C2: Morning/Evening session separation...")
        constraint_count = 0
        
        # This constraint is implicitly handled by our period structure
        # Morning: periods 0-3, Evening: periods 4-7
        # We can add preference for balanced distribution if needed
        
        for subject in self.subjects:
            subject_id = subject['id']
            
            # Encourage distribution across morning and evening if subject has enough periods
            if subject['max_periods_per_week'] >= 4:
                for day in range(self.DAYS):
                    morning_periods = []
                    evening_periods = []
                    
                    for period in self.MORNING_PERIODS_LIST:
                        morning_periods.append(self.schedule_vars[subject_id][day][period])
                    
                    for period in self.EVENING_PERIODS_LIST:
                        evening_periods.append(self.schedule_vars[subject_id][day][period])
                    
                    # Don't schedule more than 2 periods in morning or evening on same day
                    if morning_periods:
                        self.model.Add(sum(morning_periods) <= 2)
                        constraint_count += 1
                    if evening_periods:
                        self.model.Add(sum(evening_periods) <= 2)
                        constraint_count += 1
        
        self.stats['total_constraints'] += constraint_count
        self.logger.debug(f"Added {constraint_count} session separation constraints")
    
    def add_constraint_c3_teacher_sessions(self):
        """C3: Each teacher ≤ max sessions per day"""
        self.logger.debug("Adding C3: Teacher session limits...")
        constraint_count = 0
        
        # Get the configurable max sessions per day
        max_sessions_per_day = self.constraints.get('max_teacher_sessions_per_day', 2)
        self.logger.debug(f"Using max sessions per day: {max_sessions_per_day}")
        
        # Group subjects by teacher
        teacher_subjects = {}
        for subject in self.subjects:
            teacher_id = subject['teacher_id']
            if teacher_id not in teacher_subjects:
                teacher_subjects[teacher_id] = []
            teacher_subjects[teacher_id].append(subject)
        
        # For each teacher, max sessions per day (configurable)
        for teacher_id, subjects in teacher_subjects.items():
            for day in range(self.DAYS):
                daily_sessions = []
                for subject in subjects:
                    subject_id = subject['id']
                    for period in range(self.PERIODS):
                        daily_sessions.append(self.schedule_vars[subject_id][day][period])
                
                self.model.Add(sum(daily_sessions) <= max_sessions_per_day)
                constraint_count += 1
        
        self.stats['total_constraints'] += constraint_count
        self.logger.debug(f"Added {constraint_count} teacher session constraints")
    
    def add_constraint_c4_lab_continuity(self):
        """C4: Lab sessions must occupy continuous periods in a lab room"""
        self.logger.debug("Adding C4: Lab continuity constraints...")
        constraint_count = 0
        
        # Check if lab continuity constraint should be disabled
        enforce_lab_continuity = self.constraints.get('enforce_lab_continuity', True)
        if not enforce_lab_continuity:
            self.logger.debug("C4 constraint disabled - lab continuity not enforced")
            return
        
        # Get the configurable lab duration
        lab_duration = self.constraints.get('lab_duration', 3)
        self.logger.debug(f"Using lab duration: {lab_duration}")
        
        for subject in self.subjects:
            if not subject['is_lab']:
                continue
                
            subject_id = subject['id']
            
            # For each day, if lab is scheduled, it must be continuous periods
            for day in range(self.DAYS):
                # Check all possible lab_duration-period windows
                for start_period in range(self.PERIODS - lab_duration + 1):
                    # If first period of lab is scheduled, next periods must also be scheduled
                    for period_offset in range(1, lab_duration):
                        period = start_period + period_offset
                        # Use direct constraint instead of implication
                        self.model.Add(self.schedule_vars[subject_id][day][period] >= 
                                     self.schedule_vars[subject_id][day][start_period])
                        constraint_count += 1
                
                # Ensure lab sessions are grouped together (no isolated periods)
                for period in range(1, self.PERIODS - 1):
                    # If middle period is scheduled, at least one adjacent period must be scheduled
                    adjacent_periods = [
                        self.schedule_vars[subject_id][day][period - 1],
                        self.schedule_vars[subject_id][day][period + 1]
                    ]
                    # Use direct constraint instead of implication
                    self.model.Add(sum(adjacent_periods) >= 
                                 self.schedule_vars[subject_id][day][period])
                    constraint_count += 1
        
        self.stats['total_constraints'] += constraint_count
        self.logger.debug(f"Added {constraint_count} lab continuity constraints")
    
    def add_constraint_c5_teacher_conflicts(self):
        """C5: No overlapping assignments for teachers"""
        self.logger.debug("Adding C5: Teacher conflict constraints...")
        constraint_count = 0
        
        # Group subjects by teacher
        teacher_subjects = {}
        for subject in self.subjects:
            teacher_id = subject['teacher_id']
            if teacher_id not in teacher_subjects:
                teacher_subjects[teacher_id] = []
            teacher_subjects[teacher_id].append(subject)
        
        # For each teacher, no overlapping assignments
        for teacher_id, subjects in teacher_subjects.items():
            if len(subjects) <= 1:
                continue
                
            for day in range(self.DAYS):
                for period in range(self.PERIODS):
                    # At most one subject per teacher per time slot
                    teacher_assignments = []
                    for subject in subjects:
                        subject_id = subject['id']
                        teacher_assignments.append(self.schedule_vars[subject_id][day][period])
                    
                    self.model.Add(sum(teacher_assignments) <= 1)
                    constraint_count += 1
        
        self.stats['total_constraints'] += constraint_count
        self.logger.debug(f"Added {constraint_count} teacher conflict constraints")
    
    def add_constraint_c6_no_lab_first_period(self):
        """C6: No lab should be scheduled in the first period of morning and evening sessions"""
        self.logger.debug("Adding C6: No lab in first period constraints...")
        constraint_count = 0
        
        # Check if this constraint is enabled
        no_lab_first_period = self.constraints.get('no_lab_first_period', True)
        if not no_lab_first_period:
            self.logger.debug("C6 constraint disabled - labs allowed in first period")
            return
        
        for subject in self.subjects:
            if not subject['is_lab']:
                continue
                
            subject_id = subject['id']
            
            for day in range(self.DAYS):
                # No lab in first period of morning/evening sessions (use normalized lists)
                if len(self.MORNING_PERIODS_LIST) > 0:
                    self.model.Add(self.schedule_vars[subject_id][day][self.MORNING_PERIODS_LIST[0]] == 0)
                    constraint_count += 1
                if len(self.EVENING_PERIODS_LIST) > 0:
                    self.model.Add(self.schedule_vars[subject_id][day][self.EVENING_PERIODS_LIST[0]] == 0)
                    constraint_count += 1
        
        self.stats['total_constraints'] += constraint_count
        self.logger.debug(f"Added {constraint_count} no-lab-first-period constraints")
    
    def add_constraint_c7_no_lab_clashes(self):
        """C7: No teacher should be assigned to two classes at the same time, and no lab clashes between different sessions within a department"""
        self.logger.debug("Adding C7: Additional conflict constraints...")
        constraint_count = 0
        
        # This is largely covered by C1 and C5, but we add extra checks for lab sessions
        for subject1 in self.subjects:
            if not subject1['is_lab']:
                continue
                
            for subject2 in self.subjects:
                if subject1['id'] >= subject2['id']:  # Avoid duplicate checks
                    continue
                    
                subject1_id = subject1['id']
                subject2_id = subject2['id']
                
                # No lab clashes in the same department
                for day in range(self.DAYS):
                    for period in range(self.PERIODS):
                        # If both are labs, they cannot be scheduled at the same time
                        if subject2['is_lab']:
                            # Use rooms to prevent conflicts
                            for room in self.rooms:
                                if room['type'] == 'laboratory':
                                    room_id = room['id']
                                    if (room_id in self.room_assignment[subject1_id][day][period] and 
                                        room_id in self.room_assignment[subject2_id][day][period]):
                                        
                                        self.model.Add(
                                            self.room_assignment[subject1_id][day][period][room_id] +
                                            self.room_assignment[subject2_id][day][period][room_id] <= 1
                                        )
                                        constraint_count += 1
        
        self.stats['total_constraints'] += constraint_count
        self.logger.debug(f"Added {constraint_count} lab clash constraints")
    
    def add_constraint_c8_single_subject_per_slot(self):
        """C8: Only one subject can be scheduled per time slot for the entire timetable"""
        self.logger.debug("Adding C8: Single subject per time slot constraints...")
        constraint_count = 0
        
        # For each day and time slot, ensure only one subject is scheduled
        for day in range(self.DAYS):
            for period in range(self.PERIODS):
                # Collect all subjects that could be scheduled at this time
                slot_assignments = []
                for subject in self.subjects:
                    subject_id = subject['id']
                    slot_assignments.append(self.schedule_vars[subject_id][day][period])
                
                # At most one subject can be scheduled at this time slot
                if len(slot_assignments) > 1:
                    self.model.Add(sum(slot_assignments) <= 1)
                    constraint_count += 1
        
        self.stats['total_constraints'] += constraint_count
        self.logger.debug(f"Added {constraint_count} single-subject-per-slot constraints")
    
    def add_all_constraints(self):
        """Add all constraints to the model"""
        self.logger.debug("Adding all optimization constraints...")
        
        self.add_basic_constraints()
        self.add_constraint_c1_room_conflicts()
        self.add_constraint_c2_session_separation()
        self.add_constraint_c3_teacher_sessions()
        self.add_constraint_c4_lab_continuity()
        self.add_constraint_c5_teacher_conflicts()
        self.add_constraint_c6_no_lab_first_period()
        self.add_constraint_c7_no_lab_clashes()
        self.add_constraint_c8_single_subject_per_slot()
        
        self.logger.debug(f"Total constraints added: {self.stats['total_constraints']}")
    
    def add_optimization_objectives(self):
        """Add optimization objectives to improve timetable quality"""
        self.logger.debug("Adding optimization objectives...")
        
        # Objective: Minimize gaps in schedule (prefer continuous periods)
        gap_penalties = []
        
        for subject in self.subjects:
            subject_id = subject['id']
            for day in range(self.DAYS):
                for period in range(1, self.PERIODS - 1):
                    # Penalize isolated periods (gaps)
                    prev_period = self.schedule_vars[subject_id][day][period - 1]
                    curr_period = self.schedule_vars[subject_id][day][period]
                    next_period = self.schedule_vars[subject_id][day][period + 1]
                    
                    # Create gap penalty variable
                    gap_var = self.model.NewBoolVar(f'gap_s{subject_id}_d{day}_p{period}')
                    
                    # Gap exists if current period is scheduled but neither adjacent period is
                    self.model.Add(gap_var >= curr_period - prev_period - next_period)
                    gap_penalties.append(gap_var)
        
        # Objective: Balance workload across days
        daily_load_vars = []
        for day in range(self.DAYS):
            daily_load = self.model.NewIntVar(0, len(self.subjects) * max(s['max_periods_per_day'] for s in self.subjects), f'daily_load_{day}')
            
            day_periods = []
            for subject in self.subjects:
                subject_id = subject['id']
                for period in range(self.PERIODS):
                    day_periods.append(self.schedule_vars[subject_id][day][period])
            
            self.model.Add(daily_load == sum(day_periods))
            daily_load_vars.append(daily_load)
        
        # Minimize total gaps and load imbalance
        if gap_penalties:
            self.model.Minimize(sum(gap_penalties))
    
    def solve(self) -> Dict[str, Any]:
        """Solve the optimization problem"""
        self.logger.debug("Starting optimization...")
        start_time = time.time()
        
        # Set solver parameters
        self.solver.parameters.max_time_in_seconds = 60  # 1 minute timeout
        self.solver.parameters.num_search_workers = 4  # Reasonable number of workers
        self.solver.parameters.log_search_progress = False  # Disable to avoid stdout pollution
        self.solver.parameters.random_seed = 42  # Set fixed seed for reproducibility
        
        # Solve
        status = self.solver.Solve(self.model)
        
        self.stats['optimization_time'] = time.time() - start_time
        self.stats['solver_status'] = self.solver.StatusName(status)
        # Clean up logs to avoid JSON parsing issues
        logs = self.log_stream.getvalue()
        # Replace actual newlines with escaped newlines for JSON
        self.stats['logs'] = logs.replace('\n', '\\n').replace('\r', '\\r') if logs else ''
        
        self.logger.debug(f"Optimization completed in {self.stats['optimization_time']:.2f} seconds")
        self.logger.debug(f"Solver status: {self.stats['solver_status']}")
        
        # Handle different solver statuses
        if status == cp_model.OPTIMAL:
            self.logger.debug("Found optimal solution")
            return self.extract_solution()
        elif status == cp_model.FEASIBLE:
            self.logger.debug("Found feasible solution")
            return self.extract_solution()
        elif status == cp_model.INFEASIBLE:
            return {
                'success': False,
                'error': 'Solver could not find a feasible timetable',
                'status': 'INFEASIBLE',
                'details': {
                    'subjects': [{'id': s['id'], 'name': s['name'], 'periods_per_week': s['max_periods_per_week']} for s in self.subjects],
                    'rooms': [{'id': r['id'], 'name': r['name'], 'type': r['type']} for r in self.rooms],
                    'constraints_summary': {
                        'total_periods_needed': sum(s['max_periods_per_week'] for s in self.subjects),
                        'total_room_capacity': len(self.rooms) * self.DAYS * self.PERIODS,
                        'lab_subjects': len([s for s in self.subjects if s['is_lab']]),
                        'lab_rooms': len([r for r in self.rooms if r['type'] == 'laboratory'])
                    }
                },
                'stats': self.stats
            }
        elif status == cp_model.UNKNOWN:
            return {
                'success': False,
                'error': 'Solver status unknown - optimization may have timed out',
                'status': 'UNKNOWN',
                'details': {
                    'timeout_seconds': 60,
                    'suggestion': 'Try reducing the number of subjects or increasing time limit'
                },
                'stats': self.stats
            }
        else:
            return {
                'success': False,
                'error': f'Optimization failed with status: {self.solver.StatusName(status)}',
                'status': self.solver.StatusName(status),
                'stats': self.stats
            }
    
    def extract_solution(self) -> Dict[str, Any]:
        """Extract the solution from the solved model"""
        self.logger.debug("Extracting solution...")
        
        schedule = []
        
        for subject in self.subjects:
            subject_id = subject['id']
            
            for day in range(self.DAYS):
                for period in range(self.PERIODS):
                    if self.solver.Value(self.schedule_vars[subject_id][day][period]) == 1:
                        # Find assigned room
                        assigned_room = None
                        for room_id in self.room_assignment[subject_id][day][period]:
                            if self.solver.Value(self.room_assignment[subject_id][day][period][room_id]) == 1:
                                assigned_room = room_id
                                break
                        
                        if assigned_room:
                            schedule.append({
                                'day': day,
                                'time_slot': period,
                                'subject_id': subject_id,
                                'teacher_id': subject['teacher_id'],
                                'room_id': assigned_room,
                                'is_lab_session': subject['is_lab'],
                                'lab_duration': 3 if subject['is_lab'] else 1
                            })
        
        # Update statistics
        self.stats['total_scheduled_periods'] = len(schedule)
        self.stats['objective_value'] = self.solver.ObjectiveValue() if self.solver.ObjectiveValue() else 0
        
        # Clean up logs to avoid JSON parsing issues
        if 'logs' in self.stats and self.stats['logs']:
            # Replace actual newlines with escaped newlines for JSON
            self.stats['logs'] = self.stats['logs'].replace('\n', '\\n').replace('\r', '\\r')
        
        return {
            'success': True,
            'timetable': schedule,
            'stats': self.stats
        }

def main():
    """Main function to run the optimization"""
    try:
        # Read input data from command line argument
        if len(sys.argv) != 2:
            error_result = {
                'success': False,
                'error': "Usage: python timetable_optimizer.py '<json_data>'",
                'stats': {'error_type': 'ArgumentError'}
            }
            print(json.dumps(error_result))
            sys.exit(0)
        
        # Parse input JSON - handle both quoted and unquoted arguments
        json_input = sys.argv[1]
        
        # Remove surrounding quotes if present
        if (json_input.startswith('"') and json_input.endswith('"')) or (json_input.startswith("'") and json_input.endswith("'")):
            json_input = json_input[1:-1]
        
        # Handle PowerShell mangled JSON (missing quotes around property names and string values)
        # This is a workaround for PowerShell's argument parsing
        if json_input.startswith('{') and ':' in json_input and not '"' in json_input[:50]:
            # Try to reconstruct proper JSON from mangled input
            import re
            # Add quotes around unquoted property names
            json_input = re.sub(r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', json_input)
            # Add quotes around unquoted string values (but not numbers, booleans, null)
            json_input = re.sub(r':\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}])', r': "\1"\2', json_input)
        
        try:
            input_data = json.loads(json_input)
        except json.JSONDecodeError as e:
            error_result = {
                'success': False,
                'error': f"Invalid JSON input: {str(e)}",
                'stats': {'error_type': 'JSONDecodeError'}
            }
            print(json.dumps(error_result))
            sys.exit(0)
        
        # Validate required input fields
        required_fields = ['department', 'subjects', 'rooms', 'constraints']
        for field in required_fields:
            if field not in input_data:
                error_result = {
                    'success': False,
                    'error': f"Missing required field: {field}",
                    'stats': {'error_type': 'ValidationError'}
                }
                print(json.dumps(error_result))
                sys.exit(0)
        
        # Check if we have subjects and rooms
        if not input_data['subjects'] or len(input_data['subjects']) == 0:
            error_result = {
                'success': False,
                'error': "No subjects provided for optimization",
                'stats': {'error_type': 'ValidationError'}
            }
            print(json.dumps(error_result))
            sys.exit(0)
            
        if not input_data['rooms'] or len(input_data['rooms']) == 0:
            error_result = {
                'success': False,
                'error': "No rooms provided for optimization",
                'stats': {'error_type': 'ValidationError'}
            }
            print(json.dumps(error_result))
            sys.exit(0)
        
        # Create and run optimizer
        # All debug output goes to stderr
        sys.stderr.write(f"Starting optimization for department: {input_data['department']['name']}\n")
        sys.stderr.write(f"Subjects: {len(input_data['subjects'])}, Rooms: {len(input_data['rooms'])}\n")
        sys.stderr.flush()
        
        optimizer = TimetableOptimizer(input_data)
        optimizer.create_variables()
        optimizer.add_all_constraints()
        optimizer.add_optimization_objectives()
        
        result = optimizer.solve()
        
        # Ensure we always output valid JSON
        if not isinstance(result, dict):
            result = {
                'success': False,
                'error': 'Optimizer returned invalid result format',
                'stats': {'error_type': 'InternalError'}
            }
        
        # CRITICAL: Only output the JSON result to stdout, nothing else
        # Ensure a trailing newline so line-based readers (e.g., PythonShell 'message') receive it
        sys.stdout.write(json.dumps(result) + "\n")
        sys.stdout.flush()
        
        # Log to stderr for debugging (won't interfere with JSON parsing)
        if result.get('success', False):
            timetable_slots = len(result.get('timetable', []))
            print(f"SUCCESS: Generated {timetable_slots} time slots for {input_data['department']['name']}", file=sys.stderr)
        else:
            print(f"FAILED: {result.get('error', 'Unknown error')}", file=sys.stderr)
            print(f"Status: {result.get('status', 'Unknown')}", file=sys.stderr)
        
        # Always exit with code 0 to indicate the script ran successfully
        # (even if optimization failed - that's a business logic failure, not a script failure)
        sys.exit(0)
        
    except ImportError as e:
        error_result = {
            'success': False,
            'error': f"Missing required Python package: {str(e)}. Please install OR-Tools: pip install ortools",
            'stats': {'error_type': 'ImportError'}
        }
        print(json.dumps(error_result))
        print(f"IMPORT ERROR: {str(e)}", file=sys.stderr)
        sys.exit(0)  # Exit with 0 so Node.js can parse the JSON error
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': f"Unexpected error during optimization: {str(e)}",
            'stats': {
                'error_type': type(e).__name__,
                'error_details': str(e)
            }
        }
        print(json.dumps(error_result))
        print(f"UNEXPECTED ERROR: {type(e).__name__}: {str(e)}", file=sys.stderr)
        sys.exit(0)  # Exit with 0 so Node.js can parse the JSON error

if __name__ == '__main__':
    main()

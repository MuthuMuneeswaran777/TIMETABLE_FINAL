#!/usr/bin/env python3
"""
Timetable Optimization Script using Google OR-Tools
Implements constraints C1-C7 for optimal timetable generation
"""

import json
import sys
from ortools.sat.python import cp_model
from typing import Dict, List, Any, Tuple
import time

class TimetableOptimizer:
    def __init__(self, data: Dict[str, Any]):
        self.data = data
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        
        # Extract data
        self.department = data['department']
        self.subjects = data['subjects']
        self.rooms = data['rooms']
        self.constraints = data['constraints']
        
        # Constants
        self.DAYS = self.constraints['days_per_week']  # 5 days (Mon-Fri)
        self.PERIODS = self.constraints['periods_per_day']  # 8 periods per day
        self.MORNING_PERIODS = self.constraints['morning_periods']  # 0-3
        self.EVENING_PERIODS = self.constraints['evening_periods']  # 4-7
        self.LAB_DURATION = self.constraints['lab_duration']  # 3 continuous periods
        
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
            'conflicts_resolved': 0
        }
    
    def create_variables(self):
        """Create decision variables for the optimization model"""
        print("Creating decision variables...")
        
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
        
        print(f"Created {self.stats['total_variables']} variables")
    
    def add_basic_constraints(self):
        """Add basic scheduling constraints"""
        print("Adding basic constraints...")
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
        print(f"Added {constraint_count} basic constraints")
    
    def add_constraint_c1_room_conflicts(self):
        """C1: No two classes in the same room at the same time within a department"""
        print("Adding C1: Room conflict constraints...")
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
        print(f"Added {constraint_count} room conflict constraints")
    
    def add_constraint_c2_session_separation(self):
        """C2: Timetable should be scheduled separately for morning and evening sessions"""
        print("Adding C2: Morning/Evening session separation...")
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
                    
                    for period in range(self.MORNING_PERIODS):
                        morning_periods.append(self.schedule_vars[subject_id][day][period])
                    
                    for period in range(self.MORNING_PERIODS, self.PERIODS):
                        evening_periods.append(self.schedule_vars[subject_id][day][period])
                    
                    # Don't schedule more than 2 periods in morning or evening on same day
                    self.model.Add(sum(morning_periods) <= 2)
                    self.model.Add(sum(evening_periods) <= 2)
                    constraint_count += 2
        
        self.stats['total_constraints'] += constraint_count
        print(f"Added {constraint_count} session separation constraints")
    
    def add_constraint_c3_teacher_sessions(self):
        """C3: Each teacher ≤ 2 sessions per day"""
        print("Adding C3: Teacher session limits...")
        constraint_count = 0
        
        # Group subjects by teacher
        teacher_subjects = {}
        for subject in self.subjects:
            teacher_id = subject['teacher_id']
            if teacher_id not in teacher_subjects:
                teacher_subjects[teacher_id] = []
            teacher_subjects[teacher_id].append(subject)
        
        # For each teacher, max 2 sessions per day
        for teacher_id, subjects in teacher_subjects.items():
            for day in range(self.DAYS):
                daily_sessions = []
                for subject in subjects:
                    subject_id = subject['id']
                    for period in range(self.PERIODS):
                        daily_sessions.append(self.schedule_vars[subject_id][day][period])
                
                self.model.Add(sum(daily_sessions) <= 2)
                constraint_count += 1
        
        self.stats['total_constraints'] += constraint_count
        print(f"Added {constraint_count} teacher session constraints")
    
    def add_constraint_c4_lab_continuity(self):
        """C4: Lab sessions must occupy 3 continuous periods in a lab room"""
        print("Adding C4: Lab continuity constraints...")
        constraint_count = 0
        
        for subject in self.subjects:
            if not subject['is_lab']:
                continue
                
            subject_id = subject['id']
            
            # For each day, if lab is scheduled, it must be 3 continuous periods
            for day in range(self.DAYS):
                # Check all possible 3-period windows
                for start_period in range(self.PERIODS - 2):  # 0-5 for 8 periods
                    # If first period of lab is scheduled, next 2 must also be scheduled
                    for period_offset in range(1, 3):
                        period = start_period + period_offset
                        self.model.AddImplication(
                            self.schedule_vars[subject_id][day][start_period],
                            self.schedule_vars[subject_id][day][period]
                        )
                        constraint_count += 1
                
                # Ensure lab sessions are grouped together (no isolated periods)
                for period in range(1, self.PERIODS - 1):
                    # If middle period is scheduled, at least one adjacent period must be scheduled
                    adjacent_periods = [
                        self.schedule_vars[subject_id][day][period - 1],
                        self.schedule_vars[subject_id][day][period + 1]
                    ]
                    self.model.AddImplication(
                        self.schedule_vars[subject_id][day][period],
                        sum(adjacent_periods) >= 1
                    )
                    constraint_count += 1
        
        self.stats['total_constraints'] += constraint_count
        print(f"Added {constraint_count} lab continuity constraints")
    
    def add_constraint_c5_teacher_conflicts(self):
        """C5: No overlapping assignments for teachers"""
        print("Adding C5: Teacher conflict constraints...")
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
        print(f"Added {constraint_count} teacher conflict constraints")
    
    def add_constraint_c6_no_lab_first_period(self):
        """C6: No lab should be scheduled in the first period of morning and evening sessions"""
        print("Adding C6: No lab in first period constraints...")
        constraint_count = 0
        
        for subject in self.subjects:
            if not subject['is_lab']:
                continue
                
            subject_id = subject['id']
            
            for day in range(self.DAYS):
                # No lab in first period of morning (period 0)
                self.model.Add(self.schedule_vars[subject_id][day][0] == 0)
                constraint_count += 1
                
                # No lab in first period of evening (period 4)
                self.model.Add(self.schedule_vars[subject_id][day][4] == 0)
                constraint_count += 1
        
        self.stats['total_constraints'] += constraint_count
        print(f"Added {constraint_count} no-lab-first-period constraints")
    
    def add_constraint_c7_no_lab_clashes(self):
        """C7: No teacher should be assigned to two classes at the same time, and no lab clashes between different sessions within a department"""
        print("Adding C7: Additional conflict constraints...")
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
        print(f"Added {constraint_count} lab clash constraints")
    
    def add_all_constraints(self):
        """Add all constraints to the model"""
        print("Adding all optimization constraints...")
        
        self.add_basic_constraints()
        self.add_constraint_c1_room_conflicts()
        self.add_constraint_c2_session_separation()
        self.add_constraint_c3_teacher_sessions()
        self.add_constraint_c4_lab_continuity()
        self.add_constraint_c5_teacher_conflicts()
        self.add_constraint_c6_no_lab_first_period()
        self.add_constraint_c7_no_lab_clashes()
        
        print(f"Total constraints added: {self.stats['total_constraints']}")
    
    def add_optimization_objectives(self):
        """Add optimization objectives to improve timetable quality"""
        print("Adding optimization objectives...")
        
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
        print("Starting optimization...")
        start_time = time.time()
        
        # Set solver parameters
        self.solver.parameters.max_time_in_seconds = 60  # 1 minute timeout
        self.solver.parameters.num_search_workers = 8  # Increase parallel workers
        self.solver.parameters.log_search_progress = True  # Enable logging
        self.solver.parameters.random_seed = 42  # Set fixed seed for reproducibility
        
        # Solve
        status = self.solver.Solve(self.model)
        
        self.stats['optimization_time'] = time.time() - start_time
        self.stats['solver_status'] = self.solver.StatusName(status)
        
        print(f"Optimization completed in {self.stats['optimization_time']:.2f} seconds")
        print(f"Solver status: {self.stats['solver_status']}")
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            return self.extract_solution()
        else:
            return {
                'success': False,
                'error': f'Optimization failed: {self.solver.StatusName(status)}',
                'stats': self.stats
            }
    
    def extract_solution(self) -> Dict[str, Any]:
        """Extract the solution from the solved model"""
        print("Extracting solution...")
        
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
        
        return {
            'success': True,
            'schedule': schedule,
            'stats': self.stats
        }

def main():
    """Main function to run the optimization"""
    try:
        # Read input data from command line argument
        if len(sys.argv) != 2:
            raise ValueError("Usage: python timetable_optimizer.py '<json_data>'")
        
        input_data = json.loads(sys.argv[1])
        
        # Create and run optimizer
        optimizer = TimetableOptimizer(input_data)
        optimizer.create_variables()
        optimizer.add_all_constraints()
        optimizer.add_optimization_objectives()
        
        result = optimizer.solve()
        
        # Output result as JSON
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'stats': {'error_type': type(e).__name__}
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == '__main__':
    main()

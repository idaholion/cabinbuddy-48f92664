import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const CheckoutList = () => {
  const navigate = useNavigate();
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());

  const toggleTask = (taskId: string) => {
    const newCheckedTasks = new Set(checkedTasks);
    if (newCheckedTasks.has(taskId)) {
      newCheckedTasks.delete(taskId);
    } else {
      newCheckedTasks.add(taskId);
    }
    setCheckedTasks(newCheckedTasks);
  };

  const checklistSections = [
    {
      title: "Lower Level Inside",
      tasks: [
        "Wipe down tables and chairs",
        "Vacuum all floors/move furniture to vacuum under",
        "Clean bathtub, sink and toilet",
        "Clean inside of large picture windows",
        "Clean fridge/remove all food except condiments",
        "Clean stove and wipe out oven (If food spilled clean oven)",
        "Put away all games and toys",
        "Wipe down counters and kitchen sink",
        "Close all drapes and blinds",
        "Wipe down cabinet fronts and shelves if food spilled",
        "Dust mantle and wood surfaces",
        "Close all downstairs windows"
      ]
    },
    {
      title: "Upper Level Inside",
      tasks: [
        "Clean sink and toilet",
        "Clean upstairs bathroom sink and toilet",
        "Vacuum floors",
        "Stack mattresses",
        "Dust furniture (bed and dresser)",
        "Wash and change all bedding",
        "Close all upstairs windows",
        "Sweep upstairs outside porch"
      ]
    },
    {
      title: "Outside",
      tasks: [
        "Pick up all garbage from yard",
        "Ensure that bully barn is in neat order, all items are hung up or put away",
        "Hose out rowboats/canoes",
        "Brush cobwebs from all lower story windows",
        "Wipe down picnic table",
        "Clean and sweep all decks and porches",
        "Gather up hose",
        "Clean outside of large picture windows",
        "Empty out ashes from fire pit. Clean up, rake fire pit area. Stack unused firewood neatly"
      ]
    },
    {
      title: "Back Entry",
      tasks: [
        "Straighten shelves",
        "Fold and stack towels",
        "Empty washer and dryer"
      ]
    }
  ];

  const totalTasks = checklistSections.reduce((total, section) => total + section.tasks.length, 0);
  const completedTasks = checkedTasks.size;
  const progressPercentage = (completedTasks / totalTasks) * 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-foreground">Checkout List</h1>
              <p className="text-sm text-muted-foreground">
                Complete all tasks before leaving the cabin
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {completedTasks}/{totalTasks}
              </div>
              <div className="text-xs text-muted-foreground">Tasks Complete</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {progressPercentage.toFixed(0)}% Complete
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6">
          {checklistSections.map((section, sectionIndex) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="text-xl">{section.title}</CardTitle>
                <CardDescription>
                  {section.tasks.filter(task => checkedTasks.has(`${sectionIndex}-${task}`)).length} of {section.tasks.length} tasks completed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {section.tasks.map((task, taskIndex) => {
                    const taskId = `${sectionIndex}-${task}`;
                    const isChecked = checkedTasks.has(taskId);
                    
                    return (
                      <div 
                        key={taskIndex}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => toggleTask(taskId)}
                      >
                        <div className="mt-0.5">
                          {isChecked ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <span 
                          className={`text-sm ${
                            isChecked 
                              ? 'line-through text-muted-foreground' 
                              : 'text-foreground'
                          }`}
                        >
                          {task}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Completion Message */}
        {completedTasks === totalTasks && (
          <Card className="mt-6 bg-primary/10 border-primary/20">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">
                All Tasks Complete!
              </h3>
              <p className="text-sm text-muted-foreground">
                Thank you for taking care of our cabin. Have a safe trip home!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CheckoutList;
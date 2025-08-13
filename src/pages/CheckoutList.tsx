import { ArrowLeft, CheckCircle2, Circle, Edit3, Plus, Trash2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useOrgAdmin } from "@/hooks/useOrgAdmin";

const CheckoutList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());
  const [isEditing, setIsEditing] = useState(false);
  const { isAdmin } = useOrgAdmin();
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState("");
  const [checklistSections, setChecklistSections] = useState([
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
  ]);

  const [surveyItems, setSurveyItems] = useState([
    { id: "shopped", label: "Shopped - Groceries, Sporting Goods, Home Improvements/Lumber" },
    { id: "homeRepair", label: "Home Repair" },
    { id: "dinedOut", label: "Dined Out" },
    { id: "hiredGuide", label: "Hired Guide" },
    { id: "tickets", label: "Tickets - Entertainment" },
    { id: "yellowstone", label: "Went - Yellowstone Park" },
    { id: "fishingLicense", label: "Bought Fishing/Hunting License" },
    { id: "other", label: "Other" }
  ]);
  const [surveyData, setSurveyData] = useState<Record<string, string>>({});

  useEffect(() => {
    const familyData = localStorage.getItem('familySetupData');
    if (familyData) {
      const { organizationCode } = JSON.parse(familyData);
      
      const savedCheckoutList = localStorage.getItem(`checkout_checklist_${organizationCode}`);
      if (savedCheckoutList) {
        setChecklistSections(JSON.parse(savedCheckoutList));
      }
      
      const savedSurveyItems = localStorage.getItem(`survey_items_${organizationCode}`);
      if (savedSurveyItems) {
        setSurveyItems(JSON.parse(savedSurveyItems));
      }
      
      // Load saved checklist completion state
      const savedCompletion = localStorage.getItem(`checkout_completion_${organizationCode}`);
      if (savedCompletion) {
        const completionData = JSON.parse(savedCompletion);
        setCheckedTasks(new Set(completionData.checkedTasks || []));
      }
      
      const initialSurveyData: Record<string, string> = {};
      surveyItems.forEach(item => {
        initialSurveyData[item.id] = "";
      });
      setSurveyData(initialSurveyData);
    }
  }, []);

  const handleSurveyChange = (field: string, value: string) => {
    const numericValue = value.replace(/\D/g, "").slice(0, 6);
    setSurveyData(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  const toggleTask = (taskId: string) => {
    const newCheckedTasks = new Set(checkedTasks);
    if (newCheckedTasks.has(taskId)) {
      newCheckedTasks.delete(taskId);
    } else {
      newCheckedTasks.add(taskId);
    }
    setCheckedTasks(newCheckedTasks);
  };

  const saveCheckoutList = () => {
    const familyData = localStorage.getItem('familySetupData');
    if (familyData) {
      const { organizationCode } = JSON.parse(familyData);
      localStorage.setItem(`checkout_checklist_${organizationCode}`, JSON.stringify(checklistSections));
      toast({
        title: "Checkout Checklist Saved",
        description: "Checkout checklist has been saved for your organization.",
      });
    }
  };

  const saveSurveyItems = () => {
    const familyData = localStorage.getItem('familySetupData');
    if (familyData) {
      const { organizationCode } = JSON.parse(familyData);
      localStorage.setItem(`survey_items_${organizationCode}`, JSON.stringify(surveyItems));
      toast({
        title: "Survey Items Saved",
        description: "Survey items have been saved for your organization.",
      });
    }
  };

  const startEditSectionTitle = (sectionIndex: number, currentTitle: string) => {
    setEditingSectionId(sectionIndex);
    setEditingSectionTitle(currentTitle);
  };

  const saveEditSectionTitle = () => {
    if (editingSectionTitle.trim() && editingSectionId !== null) {
      const updatedSections = [...checklistSections];
      updatedSections[editingSectionId].title = editingSectionTitle.trim();
      setChecklistSections(updatedSections);
      setEditingSectionId(null);
      setEditingSectionTitle("");
      saveCheckoutList();
      toast({
        title: "Section Title Updated",
        description: "Section title has been updated.",
      });
    }
  };

  const cancelEditSectionTitle = () => {
    setEditingSectionId(null);
    setEditingSectionTitle("");
  };

  const deleteSection = (sectionIndex: number) => {
    const updatedSections = checklistSections.filter((_, index) => index !== sectionIndex);
    setChecklistSections(updatedSections);
    saveCheckoutList();
    toast({
      title: "Section Deleted",
      description: "Checkout section has been removed.",
    });
  };

  const addNewSection = () => {
    if (newTaskLabel.trim()) {
      const newSection = {
        title: newTaskLabel.trim(),
        tasks: []
      };
      setChecklistSections(prev => [...prev, newSection]);
      setNewTaskLabel("");
      saveCheckoutList();
      toast({
        title: "Section Added",
        description: "New checkout section has been added.",
      });
    }
  };

  const addNewSurveyItem = () => {
    if (newTaskLabel.trim()) {
      const newItem = {
        id: `custom_${Date.now()}`,
        label: newTaskLabel.trim()
      };
      setSurveyItems(prev => [...prev, newItem]);
      setSurveyData(prev => ({ ...prev, [newItem.id]: "" }));
      setNewTaskLabel("");
      saveSurveyItems();
    }
  };

  const deleteSurveyItem = (itemId: string) => {
    setSurveyItems(prev => prev.filter(item => item.id !== itemId));
    setSurveyData(prev => {
      const { [itemId]: deleted, ...rest } = prev;
      return rest;
    });
    saveSurveyItems();
    toast({
      title: "Survey Item Deleted",
      description: "Survey item has been removed.",
    });
  };

  const startEditSurveyItem = (item: any) => {
    setEditingTaskId(item.id);
    setEditingLabel(item.label);
  };

  const saveEditSurveyItem = () => {
    if (editingLabel.trim() && editingTaskId) {
      setSurveyItems(prev => 
        prev.map(item => 
          item.id === editingTaskId 
            ? { ...item, label: editingLabel.trim() }
            : item
        )
      );
      setEditingTaskId(null);
      setEditingLabel("");
      saveSurveyItems();
      toast({
        title: "Survey Item Updated",
        description: "Survey item has been updated.",
      });
    }
  };

  const addNewTask = (sectionIndex: number) => {
    if (newTaskLabel.trim()) {
      const updatedSections = [...checklistSections];
      updatedSections[sectionIndex].tasks.push(newTaskLabel.trim());
      setChecklistSections(updatedSections);
      setNewTaskLabel("");
      saveCheckoutList();
    }
  };

  const deleteTask = (sectionIndex: number, taskIndex: number) => {
    const updatedSections = [...checklistSections];
    updatedSections[sectionIndex].tasks.splice(taskIndex, 1);
    setChecklistSections(updatedSections);
    saveCheckoutList();
    toast({
      title: "Task Deleted",
      description: "Checkout task has been removed.",
    });
  };

  const startEditTask = (sectionIndex: number, taskIndex: number, taskLabel: string) => {
    setEditingTaskId(`${sectionIndex}-${taskIndex}`);
    setEditingLabel(taskLabel);
  };

  const saveEditTask = () => {
    if (editingLabel.trim() && editingTaskId) {
      const [sectionIndex, taskIndex] = editingTaskId.split('-').map(Number);
      const updatedSections = [...checklistSections];
      updatedSections[sectionIndex].tasks[taskIndex] = editingLabel.trim();
      setChecklistSections(updatedSections);
      setEditingTaskId(null);
      setEditingLabel("");
      saveCheckoutList();
      toast({
        title: "Task Updated",
        description: "Checkout task has been updated.",
      });
    }
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditingLabel("");
  };

  const totalTasks = checklistSections.reduce((total, section) => total + section.tasks.length, 0);
  const completedTasks = checkedTasks.size;
  const progressPercentage = (completedTasks / totalTasks) * 100;
  const isChecklistComplete = totalTasks > 0 && completedTasks === totalTasks;

  // Save checklist completion status
  const saveChecklistCompletion = () => {
    const familyData = localStorage.getItem('familySetupData');
    if (familyData) {
      const { organizationCode } = JSON.parse(familyData);
      const completionData = {
        checkedTasks: Array.from(checkedTasks),
        isComplete: isChecklistComplete,
        completedAt: isChecklistComplete ? new Date().toISOString() : null,
        totalTasks,
        completedTasks
      };
      localStorage.setItem(`checkout_completion_${organizationCode}`, JSON.stringify(completionData));
      toast({
        title: "Checklist Saved",
        description: `Checkout checklist saved (${completedTasks}/${totalTasks} tasks completed)`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/home")}
              className="shrink-0 text-base"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-6xl mb-4 font-kaushan text-primary drop-shadow-lg text-center">Checkout Checklist</h1>
              <p className="text-base text-muted-foreground">
                Complete all tasks before leaving the cabin
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary">
                {completedTasks}/{totalTasks}
              </div>
              <div className="text-base text-muted-foreground">Tasks Complete</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <p className="text-base text-muted-foreground mt-1">
            {progressPercentage.toFixed(0)}% Complete
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6">
          {checklistSections.map((section, sectionIndex) => (
            <Card key={sectionIndex}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  {editingSectionId === sectionIndex ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <Input
                        value={editingSectionTitle}
                        onChange={(e) => setEditingSectionTitle(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') saveEditSectionTitle();
                          if (e.key === 'Escape') cancelEditSectionTitle();
                        }}
                        className="text-xl font-semibold text-base placeholder:text-base"
                        autoFocus
                      />
                      <Button onClick={saveEditSectionTitle} size="sm" variant="outline" className="text-base">
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button onClick={cancelEditSectionTitle} size="sm" variant="outline" className="text-base">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <CardTitle className="text-xl">{section.title}</CardTitle>
                        <CardDescription className="text-base">
                          {section.tasks.filter(task => checkedTasks.has(`${sectionIndex}-${task}`)).length} of {section.tasks.length} tasks completed
                        </CardDescription>
                      </div>
                      {isAdmin && isEditing && (
                        <div className="flex items-center space-x-1">
                          <Button 
                            onClick={() => startEditSectionTitle(sectionIndex, section.title)} 
                            size="sm" 
                            variant="ghost"
                            className="text-base"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button 
                            onClick={() => deleteSection(sectionIndex)} 
                            size="sm" 
                            variant="ghost"
                            className="text-destructive hover:text-destructive text-base"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-0.5">
                  {section.tasks.map((task, taskIndex) => {
                    const taskId = `${sectionIndex}-${task}`;
                    const isChecked = checkedTasks.has(taskId);
                    const editId = `${sectionIndex}-${taskIndex}`;
                    
                    return (
                      <div 
                        key={taskIndex}
                        className="flex items-start gap-3 p-1 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className="mt-0.5">
                          {isChecked ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Circle 
                              className="h-5 w-5 text-muted-foreground cursor-pointer" 
                              onClick={() => toggleTask(taskId)}
                            />
                          )}
                        </div>
                        {editingTaskId === editId ? (
                          <div className="flex items-center space-x-2 flex-1">
                            <Input
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') saveEditTask();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              className="flex-1 text-base placeholder:text-base"
                              autoFocus
                            />
                            <Button onClick={saveEditTask} size="sm" variant="outline" className="text-base">
                              Save
                            </Button>
                            <Button onClick={cancelEdit} size="sm" variant="outline" className="text-base">
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <>
                            <span 
                              className={`text-base flex-1 ${
                                isChecked 
                                  ? 'line-through text-muted-foreground' 
                                  : 'text-foreground'
                              } ${!isChecked ? 'cursor-pointer' : ''}`}
                              onClick={() => !isChecked && toggleTask(taskId)}
                            >
                              {task}
                            </span>
                            {isAdmin && isEditing && (
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                  onClick={() => startEditTask(sectionIndex, taskIndex, task)} 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-base"
                                >
                                  <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button 
                                  onClick={() => deleteTask(sectionIndex, taskIndex)} 
                                  size="sm" 
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive text-base"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                  
                  {isEditing && (
                    <div className="flex items-center space-x-2 mt-4">
                      <Input
                        placeholder="Add new task..."
                        value={newTaskLabel}
                        onChange={(e) => setNewTaskLabel(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addNewTask(sectionIndex)}
                        className="text-base placeholder:text-base"
                      />
                      <Button onClick={() => addNewTask(sectionIndex)} size="sm" className="text-base">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {isAdmin && (
                  <div className="flex items-center space-x-2 pt-4 border-t mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                      className="flex items-center gap-2 text-base"
                    >
                      <Edit3 className="h-4 w-4" />
                      {isEditing ? "Done Editing" : "Edit Tasks"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-2 text-base"
                    >
                      <Plus className="h-4 w-4" />
                      Add Tasks
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {isAdmin && isEditing && (
            <Card className="border-dashed">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Add new section..."
                    value={newTaskLabel}
                    onChange={(e) => setNewTaskLabel(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNewSection()}
                    className="text-base placeholder:text-base"
                  />
                  <Button onClick={addNewSection} size="sm" className="text-base">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Section
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {completedTasks === totalTasks && (
          <Card className="mt-6 bg-primary/10 border-primary/20">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary mb-2">
                All Tasks Complete!
              </h3>
              <p className="text-base text-muted-foreground">
                Thank you for taking care of our cabin. Have a safe trip home!
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-xl">Cabin Coalition Economic Survey</CardTitle>
            <CardDescription className="text-base">
              Cabin Coalition is a lobbying group that works on the lease amounts. They periodically send us a long survey to help them show that the cabin holders benefit the community economically. To help fill out the survey, mark how many times you did the following within 50 miles of the Cabin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Label className="text-base font-medium">
                How many people did the following? How Many Times? (If 6 people dined out 2 times, that's 12)
              </Label>
            </div>
            <div className="grid gap-1">
              {surveyItems.map((item) => (
                <div key={item.id} className="flex items-center gap-4 group">
                  {editingTaskId === item.id ? (
                    <div className="flex items-center space-x-2 flex-1">
                      <Input
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') saveEditSurveyItem();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        className="flex-1 text-base placeholder:text-base"
                        autoFocus
                      />
                      <Button onClick={saveEditSurveyItem} size="sm" variant="outline" className="text-base">
                        Save
                      </Button>
                      <Button onClick={cancelEdit} size="sm" variant="outline" className="text-base">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Label htmlFor={item.id} className="text-base font-medium flex-1">
                        {item.label}
                      </Label>
                      {isAdmin && isEditing && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            onClick={() => startEditSurveyItem(item)} 
                            size="sm" 
                            variant="ghost"
                            className="h-6 w-6 p-0 text-base"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button 
                            onClick={() => deleteSurveyItem(item.id)} 
                            size="sm" 
                            variant="ghost"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive text-base"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <Input
                        id={item.id}
                        type="text"
                        value={surveyData[item.id] || ""}
                        onChange={(e) => handleSurveyChange(item.id, e.target.value)}
                        placeholder="Total"
                        maxLength={6}
                        className="w-24 text-base placeholder:text-base"
                        style={{ width: "1in" }}
                      />
                    </>
                  )}
                </div>
              ))}

              {isEditing && (
                <div className="flex items-center space-x-2 mt-4">
                  <Input
                    placeholder="Add new survey item..."
                    value={newTaskLabel}
                    onChange={(e) => setNewTaskLabel(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addNewSurveyItem()}
                    className="text-base placeholder:text-base"
                  />
                  <Button onClick={addNewSurveyItem} size="sm" className="text-base">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {isAdmin && (
                <div className="flex items-center space-x-2 pt-4 border-t mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(!isEditing)}
                    className="flex items-center gap-2 text-base"
                  >
                    <Edit3 className="h-4 w-4" />
                    {isEditing ? "Done Editing" : "Edit Survey"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 text-base"
                  >
                    <Plus className="h-4 w-4" />
                    Add Items
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-4 mt-6 pt-4 border-t">
                <Label className="text-base font-medium">
                  Approximate $ spent in area
                </Label>
                <Input
                  type="text"
                  placeholder="Total $"
                  maxLength={6}
                  className="w-24 text-base placeholder:text-base"
                  style={{ width: "1in" }}
                />
              </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                onClick={saveChecklistCompletion}
                variant="outline"
                className="text-base"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Checklist
              </Button>
              
              {isAdmin && (
                <Button
                  onClick={() => {
                    setIsEditing(!isEditing);
                    setEditingTaskId(null);
                    setEditingLabel("");
                    setEditingSectionId(null);
                    setEditingSectionTitle("");
                    setNewTaskLabel("");
                  }}
                  variant="outline"
                  className="text-base"
                >
                  {isEditing ? "Done Editing" : "Edit Lists"}
                </Button>
              )}
              
              <Button
                onClick={() => {
                  if (isChecklistComplete) {
                    saveChecklistCompletion();
                    toast({
                      title: "Checkout Complete!",
                      description: "All tasks completed. Proceeding to final checkout.",
                    });
                    navigate("/checkout-final");
                  } else {
                    toast({
                      title: "Checklist Incomplete",
                      description: `Please complete all ${totalTasks} tasks before proceeding to final checkout.`,
                      variant: "destructive",
                    });
                  }
                }}
                className="flex-1 text-base"
                disabled={!isChecklistComplete}
              >
                {isChecklistComplete ? "Proceed to Final Checkout" : `Complete All Tasks (${completedTasks}/${totalTasks})`}
              </Button>
            </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CheckoutList;

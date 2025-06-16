// 题目数据
const questions = [
    {
        question: "",
        answer: ""
    },
    {
        question: "",
        answer: ""
    }
];

// DeepSeek API配置
const DEEPSEEK_API_KEY = "sk-9592e4f1a0464e20b687db13ec24a0ea";
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

// 获取AI生成题目
async function getAIQuestion() {
    
        const response = await fetch(DEEPSEEK_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${"sk-9592e4f1a0464e20b687db13ec24a0ea"}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: '你是海龟汤创作者。'
                    },
                    {
                        role: 'user',
                        content: `
    "标题": "电梯",
    "汤面": "我走进电梯准备去上学，随着电梯的上升，我知道，我再也无法去学校了。",
    "汤底": "星期一早上，在妈妈的催促之下我心不在焉的走进电梯准备去学校，电梯门合上后，由于我刚起床头脑还不太清醒，忘了按一楼的楼层键，于是电梯便持续上升，我意识到自己没按楼层，正准备按下一楼楼层时，电梯突然停了，电梯门缓缓打开，我看到一个女孩倒在血泊中，而一个男人正在清理现场...男人听到动静，突然转过头来看向我，那双眼睛死死的盯着我的手，我吓了一跳，赶紧狂按电梯关门键，就在电梯即将关上的那一刹那，一双带着血的手伸了进来，我知道我再也无法去学校了。（电梯之所以上升是因为女孩被杀害前为了求救按了电梯按钮）"
 生成类似的海龟汤
严格按照以下格式返回：\n标题：<标题内容>\n题目：<题目内容>\n答案：<答案内容>`
                        }
                ],
                temperature: 2.0
            })
        });

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        //console.log('AI生成的题目和答案:', aiResponse);
        
        // 增强解析逻辑
        const lines = aiResponse.split('\n').filter(line => line.trim());
        let title = '', question = '', answer = '';
        
        for (const line of lines) {
            if (line.startsWith('标题：')) title = line.substring(3).trim();
            else if (line.startsWith('题目：')) question = line.substring(3).trim();
            else if (line.startsWith('答案：')) answer = line.substring(3).trim();
        }
        
        // 验证格式并自动修正
        if (!title || !question || !answer) {
            console.warn('AI返回格式不符合要求，尝试自动修正:', aiResponse);
            
            // 尝试从原始响应中提取
            const parts = aiResponse.split(/标题：|题目：|答案：/).filter(p => p.trim());
            if (parts.length >= 3) {
                title = parts[0].trim();
                question = parts[1].trim();
                answer = parts[2].trim();
            }
        }
        
        if (title && question && answer) {
            return {
                title,
                question,
                answer
            };
        }
    
    // 如果API调用失败，返回本地题目
    return questions[Math.floor(Math.random() * questions.length)];
}

// 游戏状态
let currentQuestionIndex = 0;
let history = [];

// DOM元素
const questionDisplay = document.getElementById('current-question');
const playerInput = document.getElementById('player-input');
const submitBtn = document.getElementById('submit-btn');
const newQuestionBtn = document.getElementById('new-question-btn');
const showAnswerBtn = document.getElementById('show-answer-btn');
const historyList = document.getElementById('history-list');

// 初始化游戏
async function initGame() {
    try {
        const aiQuestion = await getAIQuestion();
        questions.push(aiQuestion);
        currentQuestionIndex = questions.length - 1;
        questionDisplay.textContent = aiQuestion.question;
        document.getElementById('current-title').textContent = aiQuestion.title || '未命名';
    } catch (error) {
        console.error('使用AI题目失败', error);
        currentQuestionIndex = Math.floor(Math.random() * questions.length);
        questionDisplay.textContent = questions[currentQuestionIndex].question;
        document.getElementById('current-title').textContent = questions[currentQuestionIndex].title || '未命名';
    }
    history = [];
    updateHistory();
}

// AI回答逻辑
async function getAIResponse(question) {
    try {
        const response = await fetch(DEEPSEEK_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: `你正在玩海龟汤游戏，必须严格遵守以下规则：\n1.只能回答"是"、"否"、"无关"或"无法回答"\n2.如果问题不是明确的肯定疑问句，必须回答"无法回答"\n3.如果问题可以用"是"、"否"或"无关"回答，必须选择最准确的一个\n4.当前题目是：${questions[currentQuestionIndex].question}\n5.当前汤底是：${questions[currentQuestionIndex].answer}\n6.回答必须严格限制在这四个选项之一，不能添加任何解释或额外信息\n7.对于任何不符合规则的回答，必须返回"无法回答"`
                    },
                    {
                        role: 'user',
                        content: question
                    }
                ],
                temperature: 0.1
            })
        });

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;
        //console.log('AI回答:', aiResponse);
        
        // 严格匹配标准回答
        if (['是', '否', '无关', '无法回答'].includes(aiResponse.trim())) {
            return aiResponse.trim();
        }
        return '无法回答';
    } catch (error) {
        console.error('获取AI回答失败:', error);
        return '无法回答';
    }
}

// 处理玩家提问
async function handlePlayerQuestion() {
    const question = playerInput.value.trim();
    if (!question) return;
    
    const response = await getAIResponse(question);
    history.push({question, response});
    playerInput.value = '';
    updateHistory();
    
    // 显示AI回答动画
    const aiResponseDisplay = document.createElement('div');
    aiResponseDisplay.id = 'ai-response-display';
    aiResponseDisplay.textContent = `${response}`;
    aiResponseDisplay.style.position = 'fixed';
    aiResponseDisplay.style.top = '50%';
    aiResponseDisplay.style.left = '50%';
    aiResponseDisplay.style.transform = 'translate(-50%, -50%)';
    aiResponseDisplay.style.color = 'white';
    aiResponseDisplay.style.fontSize = '24px';
    aiResponseDisplay.style.zIndex = '1000';
    aiResponseDisplay.style.opacity = '0';
    aiResponseDisplay.style.textShadow = '0 0 10px rgba(255,255,255,0.8)';
    document.body.appendChild(aiResponseDisplay);
    
    // 烟雾消散动画
    let opacity = 0;
    let blur = 0;
    const animate = setInterval(() => {
        opacity += 0.02;
        blur += 0.3;
        aiResponseDisplay.style.opacity = opacity;
        aiResponseDisplay.style.filter = `blur(${blur}px)`;
        
        if (opacity >= 1) {
            setTimeout(() => {
                const fadeOut = setInterval(() => {
                    opacity -= 0.001;
                    blur += 0.03;
                    aiResponseDisplay.style.opacity = opacity;
                    aiResponseDisplay.style.filter = `blur(${blur}px)`;
                    
                    if (opacity <= 0) {
                        clearInterval(fadeOut);
                        document.body.removeChild(aiResponseDisplay);
                    }
                }, 100);
            }, 10000000);
            clearInterval(animate);
        }
    }, 100);
}

// 更新提问记录
function updateHistory() {
    historyList.innerHTML = '';
    history.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `问：${item.question} → 答：${item.response}`;
        historyList.appendChild(li);
    });
}



// 显示汤底答案
function showAnswer() {
    const answerModal = document.getElementById('answer-modal');
    const answerContent = document.getElementById('answer-content');
    const closeBtn = document.querySelector('.close');
    
    closeBtn.addEventListener('click', () => {
        answerModal.style.display = 'none';
    });
    
    const currentQuestion = questions[currentQuestionIndex];
    const answer = currentQuestion.answer;
    const title = currentQuestion.title || '未命名';
    
    answerContent.innerHTML = `<h3>${title}</h3><p></p>`;
    const answerText = answerContent.querySelector('p');
    let i = 0;
    
    // 显示模态框并居中
    answerModal.style.display = 'block';
    answerModal.style.position = 'fixed';
    answerModal.style.top = '50%';
    answerModal.style.left = '50%';
    answerModal.style.transform = 'translate(-50%, -50%)';
    
    // 点击模态框外部关闭
    window.onclick = function(event) {
        if (event.target == answerModal) {
            answerModal.style.display = 'none';
        }
    };
    
    const typingInterval = setInterval(() => {
        if (i < answer.length) {
            answerText.textContent += answer.charAt(i);
            i++;
        } else {
            clearInterval(typingInterval);
        }
    }, 100);
}

// 事件监听
submitBtn.addEventListener('click', handlePlayerQuestion);
playerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handlePlayerQuestion();
});
newQuestionBtn.addEventListener('click', initGame);
showAnswerBtn.addEventListener('click', showAnswer);

// 启动游戏
initGame();
